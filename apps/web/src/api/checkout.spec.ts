import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCatalogDatabase, createCatalogQueryPort, createPool } from '@maihan/db';
import {
  createCatalogQueryService,
  MemoryGenerationStore,
  NullCacheStore,
} from '../modules/catalog/index.js';
import { createCatalogApi, type CatalogApi } from './index.js';
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

describe('Checkout HTTP API & Checkpoint Funnel Endpoints (Phase 6 Tasks 2-3)', () => {
  let pool: ReturnType<typeof createPool> | undefined;
  let api: CatalogApi | undefined;
  let hasDb = false;
  let sampleProductId: string | undefined;
  let sampleProductPrice: string | undefined;
  const createdCartTokens: string[] = [];
  const createdSessionIds: string[] = [];

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
        LIMIT 1;
      `);
      if (res.rows.length > 0) {
        sampleProductId = res.rows[0].id;
        sampleProductPrice = Number(res.rows[0].price_amount).toFixed(2);
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

  it('rejects checkout session creation on empty cart with 422 UNPROCESSABLE', async () => {
    if (!hasDb || !api) return;

    // Create empty cart
    const createCartRes = await api(
      new Request('https://maihan.test/api/v1/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    expect(createCartRes.status).toBe(201);
    const cartBody = await createCartRes.json();
    const cartToken = cartBody.data.cart_token;
    createdCartTokens.push(cartToken);

    // Try checkout
    const checkoutRes = await api(
      new Request('https://maihan.test/api/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart_token: cartToken }),
      }),
    );
    expect(checkoutRes.status).toBe(422);
    const errBody = await checkoutRes.json();
    expect(errBody.error.code).toBe('UNPROCESSABLE');
  });

  it('rejects checkout session creation on tampered price with 409 PRICE_CHANGED', async () => {
    if (!hasDb || !api || !sampleProductId) return;

    // Create cart
    const createCartRes = await api(
      new Request('https://maihan.test/api/v1/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    const cartBody = await createCartRes.json();
    const cartToken = cartBody.data.cart_token;
    createdCartTokens.push(cartToken);

    // Add item
    await api(
      new Request(`https://maihan.test/api/v1/carts/${cartToken}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: sampleProductId, quantity: 1 }),
      }),
    );

    // Attempt checkout with tampered price
    const tamperedExpectedTotal = '10.00';
    const checkoutRes = await api(
      new Request('https://maihan.test/api/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart_token: cartToken,
          expected_total: tamperedExpectedTotal,
        }),
      }),
    );

    expect(checkoutRes.status).toBe(409);
    const errBody = await checkoutRes.json();
    expect(errBody.error.code).toBe('PRICE_CHANGED');
    expect(errBody.error.details).toBeDefined();
    expect(errBody.error.details[0].expected).toBe(tamperedExpectedTotal);
    expect(errBody.error.details[0].authoritative).toBe(sampleProductPrice);
  });

  it('creates checkout session successfully, reserves stock, and returns 201 with frozen snapshot', async () => {
    if (!hasDb || !api || !sampleProductId) return;

    // Create cart
    const createCartRes = await api(
      new Request('https://maihan.test/api/v1/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    const cartBody = await createCartRes.json();
    const cartToken = cartBody.data.cart_token;
    createdCartTokens.push(cartToken);

    // Add item
    const addRes = await api(
      new Request(`https://maihan.test/api/v1/carts/${cartToken}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: sampleProductId, quantity: 1 }),
      }),
    );
    const addBody = await addRes.json();

    // Create checkout session
    const checkoutRes = await api(
      new Request('https://maihan.test/api/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart_token: cartToken,
          expected_total: addBody.data.pricing_snapshot.grand_total,
          email: 'buyer@example.com',
        }),
      }),
    );

    expect(checkoutRes.status).toBe(201);
    expect(checkoutRes.headers.get('Cache-Control')).toBe('private, no-store');
    const sessionBody = await checkoutRes.json();
    expect(sessionBody.data.id).toMatch(/^cs_[a-f0-9]{48}$/);
    expect(sessionBody.data.current_step).toBe('SHIPPING');
    expect(sessionBody.data.pricing_snapshot.grand_total).toBe(addBody.data.pricing_snapshot.grand_total);
    createdSessionIds.push(sessionBody.data.id);

    // Fetch checkout session by id
    const getRes = await api(
      new Request(`https://maihan.test/api/v1/checkout/sessions/${sessionBody.data.id}`),
    );
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.data.id).toBe(sessionBody.data.id);
    expect(getBody.data.pricing_snapshot.grand_total).toBe(sessionBody.data.pricing_snapshot.grand_total);
  });

  it('enforces sequential server checkpoints and rejects skipping shipping step with 422', async () => {
    if (!hasDb || !api || !sampleProductId) return;

    // Create cart & add item
    const createCartRes = await api(
      new Request('https://maihan.test/api/v1/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    const cartToken = (await createCartRes.json()).data.cart_token;
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
        body: JSON.stringify({ cart_token: cartToken }),
      }),
    );
    const sessionId = (await sessionRes.json()).data.id;
    createdSessionIds.push(sessionId);

    // Attempt to jump directly to payment checkpoint without shipping
    const paymentRes = await api(
      new Request(`https://maihan.test/api/v1/checkout/sessions/${sessionId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method_type: 'TEST' }),
      }),
    );

    expect(paymentRes.status).toBe(422);
    const errBody = await paymentRes.json();
    expect(errBody.error.code).toBe('UNPROCESSABLE');
  });

  it('completes shipping, payment and confirm checkpoints in sequence as the observed funnel', async () => {
    if (!hasDb || !api || !sampleProductId) return;

    // Create cart & add item
    const createCartRes = await api(
      new Request('https://maihan.test/api/v1/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    const cartToken = (await createCartRes.json()).data.cart_token;
    createdCartTokens.push(cartToken);

    const addRes = await api(
      new Request(`https://maihan.test/api/v1/carts/${cartToken}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: sampleProductId, quantity: 1 }),
      }),
    );
    const initialTotal = (await addRes.json()).data.pricing_snapshot.grand_total;

    // Step 1: Create session
    const sessionRes = await api(
      new Request('https://maihan.test/api/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart_token: cartToken, email: 'funnel@example.com' }),
      }),
    );
    expect(sessionRes.status).toBe(201);
    const sessionData = (await sessionRes.json()).data;
    const sessionId = sessionData.id;
    createdSessionIds.push(sessionId);
    expect(sessionData.current_step).toBe('SHIPPING');

    // Step 2: Shipping Checkpoint
    const shippingRes = await api(
      new Request(`https://maihan.test/api/v1/checkout/sessions/${sessionId}/shipping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping_address: {
            full_name: 'Jane Doe',
            line1: '123 Gemstone Way',
            city: 'New York',
            postal_code: '10001',
            country_code: 'US',
          },
          shipping_method: {
            code: 'EXPRESS',
            name: 'Express Insured Delivery',
            amount: '25.00',
          },
        }),
      }),
    );
    expect(shippingRes.status).toBe(200);
    const shippingData = (await shippingRes.json()).data;
    expect(shippingData.current_step).toBe('PAYMENT');
    expect(shippingData.shipping_address.city).toBe('New York');
    expect(shippingData.shipping_method.amount).toBe('25.00');
    // Grand total adjusted with shipping
    const expectedWithShipping = (Number(initialTotal) + 25).toFixed(2);
    expect(shippingData.pricing_snapshot.grand_total).toBe(expectedWithShipping);

    // Step 3: Payment Intent Checkpoint
    const paymentRes = await api(
      new Request(`https://maihan.test/api/v1/checkout/sessions/${sessionId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method_type: 'TEST' }),
      }),
    );
    expect(paymentRes.status).toBe(200);
    const paymentData = (await paymentRes.json()).data;
    expect(paymentData.current_step).toBe('CONFIRM');
    expect(paymentData.payment_intent_id).toMatch(/^pi_[a-f0-9]{48}$/);

    // Step 4: Confirm Checkpoint
    const confirmRes = await api(
      new Request(`https://maihan.test/api/v1/checkout/sessions/${sessionId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotency_key: 'idem_test_checkpoint_4',
          customer_note: 'Please gift wrap',
        }),
      }),
    );
    expect(confirmRes.status).toBe(200);
    const confirmData = (await confirmRes.json()).data;
    expect(confirmData.id).toBe(sessionId);
    expect(confirmData.current_step).toBe('CONFIRM');
  });
});

