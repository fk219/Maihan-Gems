import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCatalogDatabase, createCatalogQueryPort, createPool } from '@maihan/db';
import {
  createCatalogQueryService,
  MemoryGenerationStore,
  NullCacheStore,
} from '../modules/catalog/index.js';
import { createCatalogApi, type CatalogApi } from './index.js';
import { TestPaymentProvider } from '../integrations/payment/test-payment-provider.js';
import { StripePaymentProvider } from '../integrations/payment/stripe-payment-provider.js';
import { TransactionalEmailProvider } from '../integrations/email/email-provider.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function getDatabaseUrl(): string | undefined {
  if (process.env['DATABASE_URL']) return process.env['DATABASE_URL'];
  const envPath = resolve(process.cwd(), '../../.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        return trimmed.slice('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return undefined;
}

describe('Payment Webhooks & Reconciliation (Phase 6 Task 6)', () => {
  let pool: ReturnType<typeof createPool> | undefined;
  let api: CatalogApi | undefined;
  let hasDb = false;
  let sampleProductId: string | undefined;
  const paymentProvider = new TestPaymentProvider();
  const createdCartTokens: string[] = [];
  const createdSessionIds: string[] = [];
  const createdOrderIds: string[] = [];
  const createdExternalEventIds: string[] = [];

  beforeAll(async () => {
    const url = getDatabaseUrl();
    if (!url) return;
    try {
      pool = createPool(url, { max: 2 });
      const client = await pool.connect();
      const res = await client.query(`
        SELECT p.id, p.price_amount::text AS price_amount
        FROM products p
        JOIN gemstones g ON g.id = p.gemstone_id
        WHERE p.price_amount IS NOT NULL
          AND p.state = 'ACTIVE'
          AND g.availability = true
          AND g.state = 'ACTIVE'
          AND NOT EXISTS (
            SELECT 1 FROM jobs r
            WHERE r.job_key = 'reservation:gemstone:' || g.id::text
              AND r.queue = 'inventory_reservations'
              AND r.state = 'QUEUED'
              AND r.run_after > now()
          )
        ORDER BY p.product_number
        OFFSET 1
        LIMIT 1;
      `);
      if (res.rows.length > 0) {
        sampleProductId = res.rows[0].id;
      }
      client.release();

      const db = createCatalogDatabase(pool);
      const port = createCatalogQueryPort(db);
      const service = createCatalogQueryService({
        port,
        store: new NullCacheStore(),
        generations: new MemoryGenerationStore(),
        namespace: 'test',
      });

      api = createCatalogApi({
        service,
        db,
      });
      hasDb = true;
    } catch {
      hasDb = false;
    }
  });

  afterAll(async () => {
    if (pool) {
      const client = await pool.connect();
      try {
        for (const evtId of createdExternalEventIds) {
          await client.query(`DELETE FROM webhook_receipts WHERE external_event_id = $1`, [evtId]);
        }
        for (const orderId of createdOrderIds) {
          await client.query(`DELETE FROM payments WHERE order_id = $1`, [orderId]);
          await client.query(`DELETE FROM audit_logs WHERE entity_id = $1`, [orderId]);
          await client.query(`DELETE FROM order_events WHERE order_id = $1`, [orderId]);
          await client.query(`DELETE FROM order_items WHERE order_id = $1`, [orderId]);
          await client.query(`DELETE FROM orders WHERE id = $1`, [orderId]);
        }
        for (const token of createdCartTokens) {
          await client.query(`DELETE FROM carts WHERE cart_token = $1`, [token]);
        }
        for (const sid of createdSessionIds) {
          await client.query(`DELETE FROM jobs WHERE payload->>'sessionId' = $1`, [sid]);
          await client.query(`DELETE FROM jobs WHERE job_key = $1`, [`checkout:session:${sid}`]);
        }
      } finally {
        client.release();
        await pool.end();
      }
    }
  });

  it('rejects webhooks with missing signature with 401 UNAUTHORIZED', async () => {
    if (!hasDb || !api) return;

    const res = await api(
      new Request('https://maihan.test/api/v1/webhooks/payments/TEST', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'payment.captured' }),
      }),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects webhooks with invalid HMAC signature with 401 UNAUTHORIZED', async () => {
    if (!hasDb || !api) return;

    const res = await api(
      new Request('https://maihan.test/api/v1/webhooks/payments/TEST', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-maihan-signature': 'deadbeef00112233445566778899aabbccddeeff00112233445566778899aabb',
        },
        body: JSON.stringify({ type: 'payment.captured' }),
      }),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects webhooks with timestamp older than 5 minutes with 401 UNAUTHORIZED', async () => {
    if (!hasDb || !api) return;

    const staleTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago
    const payload = {
      id: 'evt_stale_123',
      type: 'payment.captured',
      created_at: staleTimestamp,
    };
    const rawBody = JSON.stringify(payload);
    const signature = paymentProvider.signWebhookPayload(rawBody);

    const res = await api(
      new Request('https://maihan.test/api/v1/webhooks/payments/TEST', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-maihan-signature': signature,
        },
        body: rawBody,
      }),
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.message).toContain('tolerance window');
  });

  it('reconciles valid captured webhook, updates order to PAID, and deduplicates replay', async () => {
    if (!hasDb || !api || !sampleProductId) return;

    // 1. Setup Cart and Place Order
    const cartRes = await api(
      new Request('https://maihan.test/api/v1/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    const cartToken = (await cartRes.json()).data.cart_token;
    createdCartTokens.push(cartToken);

    await api(
      new Request(`https://maihan.test/api/v1/carts/${cartToken}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: sampleProductId, quantity: 1 }),
      }),
    );

    const sessionRes = await api(
      new Request('https://maihan.test/api/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart_token: cartToken, email: 'wh_buyer@example.com' }),
      }),
    );
    const sessionId = (await sessionRes.json()).data.id;
    createdSessionIds.push(sessionId);

    await api(
      new Request(`https://maihan.test/api/v1/checkout/sessions/${sessionId}/shipping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping_address: {
            full_name: 'Recipient Name',
            line1: '123 Diamond Rd',
            city: 'London',
            postal_code: 'EC1A 1BB',
            country_code: 'GB',
          },
        }),
      }),
    );

    await api(
      new Request(`https://maihan.test/api/v1/checkout/sessions/${sessionId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method_type: 'TEST' }),
      }),
    );

    const placeRes = await api(
      new Request('https://maihan.test/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkout_session_id: sessionId,
          idempotency_key: 'idem_wh_order_1',
        }),
      }),
    );
    const order = (await placeRes.json()).data;
    createdOrderIds.push(order.id);
    expect(order.state).toBe('PENDING_PAYMENT');

    // 2. Deliver valid webhook
    const eventId = `evt_test_${Date.now()}`;
    createdExternalEventIds.push(eventId);

    const webhookPayload = {
      id: eventId,
      type: 'payment.captured',
      order_id: order.id,
      amount: order.grand_total,
      currency: 'USD',
      created_at: new Date().toISOString(),
    };
    const rawBody = JSON.stringify(webhookPayload);
    const signature = paymentProvider.signWebhookPayload(rawBody);

    const whRes = await api(
      new Request('https://maihan.test/api/v1/webhooks/payments/TEST', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-maihan-signature': signature,
        },
        body: rawBody,
      }),
    );

    expect(whRes.status).toBe(200);
    const whBody = await whRes.json();
    expect(whBody.status).toBe('processed');
    expect(whBody.order_id).toBe(order.id);

    // 3. Verify order transitioned to PAID
    const getOrderRes = await api(
      new Request(`https://maihan.test/api/v1/orders/${order.id}`),
    );
    const updatedOrder = (await getOrderRes.json()).data;
    expect(updatedOrder.state).toBe('PAID');

    // 4. Replay identical webhook -> deduplicated
    const replayRes = await api(
      new Request('https://maihan.test/api/v1/webhooks/payments/TEST', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-maihan-signature': signature,
        },
        body: rawBody,
      }),
    );

    expect(replayRes.status).toBe(200);
    const replayBody = await replayRes.json();
    expect(replayBody.status).toBe('duplicate');
  });

  it('verifies Stripe-Signature (t=...,v1=...) HMAC-SHA256 and REST authorize/capture/refund', async () => {
    const stripe = new StripePaymentProvider({
      secretKey: 'sk_test_mock_key',
      webhookSecret: 'whsec_stripe_unit_test',
      fetchImpl: async (url) => {
        const u = String(url);
        if (u.endsWith('/v1/payment_intents')) {
          return new Response(JSON.stringify({ id: 'pi_test_123', amount: 125000, currency: 'usd' }), {
            status: 200,
          });
        }
        if (u.endsWith('/capture')) {
          return new Response(
            JSON.stringify({ id: 'pi_test_123', amount_received: 125000, currency: 'usd' }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ id: 're_test_456', amount: 50000, currency: 'usd' }), {
          status: 200,
        });
      },
    });

    const authRes = await stripe.authorize({
      order_id: 'ord_1',
      order_number: 'MG-2026-000001',
      amount: '1250.00',
      currency: 'USD',
      method_type: 'CARD',
    });
    expect(authRes.provider_payment_id).toBe('pi_test_123');
    expect(authRes.amount).toBe('1250.00');

    const capRes = await stripe.capture({
      order_id: 'ord_1',
      provider_payment_id: 'pi_test_123',
      amount: '1250.00',
      currency: 'USD',
    });
    expect(capRes.captured_amount).toBe('1250.00');

    const refRes = await stripe.refund({
      order_id: 'ord_1',
      provider_payment_id: 'pi_test_123',
      amount: '500.00',
      currency: 'USD',
      reason: 'Customer request',
    });
    expect(refRes.provider_refund_id).toBe('re_test_456');

    const payload = JSON.stringify({
      id: 'evt_stripe_1',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_123',
          amount_received: 125000,
          currency: 'usd',
          metadata: { order_id: 'ord_1' },
        },
      },
    });
    const nowSec = Math.floor(Date.now() / 1000);
    const sig = stripe.signStripeWebhookPayload(payload, nowSec);
    const verified = stripe.verifyWebhook({
      rawBody: payload,
      headers: { 'stripe-signature': sig },
    });
    expect(verified.isValid).toBe(true);
    expect(verified.eventType).toBe('payment.captured');
    expect(verified.orderId).toBe('ord_1');
    expect(verified.amount).toBe('1250.00');

    // Stale timestamp outside 300s replay window fails closed
    const staleSig = stripe.signStripeWebhookPayload(payload, nowSec - 900);
    const staleVerified = stripe.verifyWebhook({
      rawBody: payload,
      headers: { 'stripe-signature': staleSig },
    });
    expect(staleVerified.isValid).toBe(false);
    expect(staleVerified.signatureError).toContain('tolerance window');
  });

  it('delivers transactional emails via Resend HTTP API or outbox fallback', async () => {
    const outboxMailer = new TransactionalEmailProvider({ resendApiKey: '', mailtrapApiToken: '' });
    const fallbackRes = await outboxMailer.send({
      to: 'collector@maihan.test',
      subject: 'Order Confirmation',
      text: 'Your piece is reserved.',
      category: 'order_confirmation',
    });
    expect(fallbackRes.delivered).toBe(true);
    expect(fallbackRes.provider).toBe('OUTBOX_LOG');

    const resendMailer = new TransactionalEmailProvider({
      resendApiKey: 're_test_key',
      fetchImpl: async () => new Response(JSON.stringify({ id: 'msg_resend_99' }), { status: 200 }),
    });
    const liveRes = await resendMailer.send({
      to: 'collector@maihan.test',
      subject: 'Verify Email',
      text: 'Verification token',
      category: 'auth_verification',
    });
    expect(liveRes.delivered).toBe(true);
    expect(liveRes.provider).toBe('RESEND');
    expect(liveRes.messageId).toBe('msg_resend_99');
  });
});
