import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createCatalogDatabase,
  createCatalogQueryPort,
  createPool,
  getOrCreateCustomer,
  type CatalogDatabase,
} from '@maihan/db';
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

describe('Refund Request & Approval Workflow (Phase 6 Task 11)', () => {
  let pool: ReturnType<typeof createPool> | undefined;
  let db: CatalogDatabase | undefined;
  let api: CatalogApi | undefined;
  let hasDb = false;
  let customerId: string | undefined;
  let testOrderId: string | undefined;

  beforeAll(async () => {
    const url = getDatabaseUrl();
    if (!url) return;
    try {
      pool = createPool(url, { max: 2 });
      db = createCatalogDatabase(pool);
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

      const cust = await getOrCreateCustomer(db, {
        email: `test_refunds_${Date.now()}@example.com`,
        first_name: 'Refund',
        last_name: 'Customer',
      });
      customerId = cust.id;

      // Seed an order and captured payment
      const client = await pool.connect();
      const orderRes = await client.query(`
        INSERT INTO orders (
          order_number,
          customer_id,
          email,
          state,
          currency,
          subtotal,
          grand_total,
          pricing_snapshot,
          shipping_address
        ) VALUES (
          $1,
          $2,
          'refund_test@example.com',
          'PAID',
          'USD',
          1000.00,
          1000.00,
          '{}'::jsonb,
          '{"full_name":"Test","line1":"1 St","city":"NYC","postal_code":"10001","country_code":"US"}'::jsonb
        )
        RETURNING id;
      `, [`MG-REFUND-${Date.now()}`, customerId]);
      testOrderId = orderRes.rows[0].id;

      const payRes = await client.query(`
        INSERT INTO payments (
          order_id,
          provider,
          provider_payment_id,
          state,
          amount,
          captured_amount,
          refunded_amount,
          currency
        ) VALUES (
          $1,
          'test_gateway',
          $2,
          'CAPTURED',
          1000.00,
          1000.00,
          0.00,
          'USD'
        )
        RETURNING id;
      `, [testOrderId, `pay_${Date.now()}`]);
      void payRes;

      client.release();
      hasDb = true;
    } catch (err) {
      console.error('Database setup failed for refund.spec.ts:', err);
      hasDb = false;
    }
  });

  afterAll(async () => {
    if (pool && hasDb) {
      const client = await pool.connect();
      try {
        if (testOrderId) {
          await client.query(`DELETE FROM refunds WHERE order_id = $1`, [testOrderId]);
          await client.query(`DELETE FROM order_events WHERE order_id = $1`, [testOrderId]);
          await client.query(`DELETE FROM payments WHERE order_id = $1`, [testOrderId]);
          await client.query(`DELETE FROM orders WHERE id = $1`, [testOrderId]);
        }
        if (customerId) {
          await client.query(`DELETE FROM customer_profiles WHERE customer_id = $1`, [customerId]);
          await client.query(`DELETE FROM customers WHERE id = $1`, [customerId]);
        }
      } catch (e) {
        console.error('Refund cleanup error:', e);
      } finally {
        client.release();
        await pool.end();
      }
    }
  });

  it('rejects refund request when amount exceeds captured amount (422 REFUND_EXCEEDS_CAPTURED)', async () => {
    if (!hasDb || !api || !testOrderId) return;

    const res = await api(
      new Request(`http://localhost/orders/${testOrderId}/refunds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 1500.0, // captured is 1000
          reason: 'Excessive refund attempt',
        }),
      }),
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe('REFUND_EXCEEDS_CAPTURED');
  });

  it('runs complete partial refund lifecycle: REQUESTED -> APPROVED -> SUCCEEDED', async () => {
    if (!hasDb || !api || !testOrderId) return;

    // 1. Request $400 partial refund
    const reqRes = await api(
      new Request(`http://localhost/orders/${testOrderId}/refunds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 400.0,
          reason: 'Customer requested return of minor item',
        }),
      }),
    );
    expect(reqRes.status).toBe(201);
    const refund = (await reqRes.json()).data;
    expect(refund.state).toBe('REQUESTED');
    expect(refund.amount).toBe('400.00');

    // 2. Approve refund
    const appRes = await api(
      new Request(`http://localhost/refunds/${refund.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    expect(appRes.status).toBe(200);
    const approved = (await appRes.json()).data;
    expect(approved.state).toBe('APPROVED');

    // 3. Execute refund
    const execRes = await api(
      new Request(`http://localhost/refunds/${refund.id}/execute`, {
        method: 'POST',
      }),
    );
    expect(execRes.status).toBe(200);
    const executed = (await execRes.json()).data;
    expect(executed.state).toBe('SUCCEEDED');
    expect(executed.processed_at).toBeDefined();

    // 4. Verify order transitioned to PARTIALLY_REFUNDED
    const orderRes = await api(
      new Request(`http://localhost/orders/${testOrderId}`, { method: 'GET' }),
    );
    expect(orderRes.status).toBe(200);
    const orderJson = await orderRes.json();
    expect(orderJson.data.state).toBe('PARTIALLY_REFUNDED');
  });

  it('completes full refund to transition order and payment to REFUNDED', async () => {
    if (!hasDb || !api || !testOrderId) return;

    // Remaining capturable is $600. Request full remaining.
    const reqRes = await api(
      new Request(`http://localhost/orders/${testOrderId}/refunds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 600.0,
          reason: 'Customer returned main gemstone',
        }),
      }),
    );
    expect(reqRes.status).toBe(201);
    const refund = (await reqRes.json()).data;

    await api(new Request(`http://localhost/refunds/${refund.id}/approve`, { method: 'POST' }));
    await api(new Request(`http://localhost/refunds/${refund.id}/execute`, { method: 'POST' }));

    // Verify order is now fully REFUNDED
    const orderRes = await api(
      new Request(`http://localhost/orders/${testOrderId}`, { method: 'GET' }),
    );
    expect(orderRes.status).toBe(200);
    const orderJson = await orderRes.json();
    expect(orderJson.data.state).toBe('REFUNDED');
  });
});
