import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createCatalogDatabase,
  createCatalogQueryPort,
  createPool,
  getOrCreateCustomer,
  getOrderEvents,
  transitionOrderState,
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

describe('Order State Machine & order_events Timeline (Phase 6 Task 13)', () => {
  let pool: ReturnType<typeof createPool> | undefined;
  let db: CatalogDatabase | undefined;
  let api: CatalogApi | undefined;
  let hasDb = false;
  let customerId: string | undefined;
  let testOrderId: string | undefined;
  let cancelOrderId: string | undefined;

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
        email: `test_timeline_${Date.now()}@example.com`,
        first_name: 'Timeline',
        last_name: 'Tester',
      });
      customerId = cust.id;

      // Create test order
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
          'timeline_test@example.com',
          'PENDING_PAYMENT',
          'USD',
          500.00,
          500.00,
          '{}'::jsonb,
          '{"full_name":"Test","line1":"1 St","city":"NYC","postal_code":"10001","country_code":"US"}'::jsonb
        )
        RETURNING id;
      `, [`MG-TIME-${Date.now()}`, customerId]);
      testOrderId = orderRes.rows[0].id;

      // Seed initial creation event
      await client.query(`
        INSERT INTO order_events (
          order_id,
          from_state,
          to_state,
          actor_type,
          actor_id,
          reason,
          metadata
        ) VALUES (
          $1,
          NULL,
          'PENDING_PAYMENT',
          'CUSTOMER',
          $2,
          'Order placed via checkout',
          '{}'::jsonb
        );
      `, [testOrderId, customerId]);

      // Create an order for cancellation test
      const cancelRes = await client.query(`
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
          'cancel_test@example.com',
          'PENDING_PAYMENT',
          'USD',
          300.00,
          300.00,
          '{}'::jsonb,
          '{"full_name":"Test","line1":"1 St","city":"NYC","postal_code":"10001","country_code":"US"}'::jsonb
        )
        RETURNING id;
      `, [`MG-CANCEL-${Date.now()}`, customerId]);
      cancelOrderId = cancelRes.rows[0].id;

      client.release();
      hasDb = true;
    } catch (err) {
      console.error('Database setup failed for order-events.spec.ts:', err);
      hasDb = false;
    }
  });

  afterAll(async () => {
    if (pool && hasDb) {
      const client = await pool.connect();
      try {
        if (testOrderId) {
          await client.query(`DELETE FROM order_events WHERE order_id = $1`, [testOrderId]);
          await client.query(`DELETE FROM orders WHERE id = $1`, [testOrderId]);
        }
        if (cancelOrderId) {
          await client.query(`DELETE FROM order_events WHERE order_id = $1`, [cancelOrderId]);
          await client.query(`DELETE FROM orders WHERE id = $1`, [cancelOrderId]);
        }
        if (customerId) {
          await client.query(`DELETE FROM customer_profiles WHERE customer_id = $1`, [customerId]);
          await client.query(`DELETE FROM customers WHERE id = $1`, [customerId]);
        }
      } catch (e) {
        console.error('Order events cleanup error:', e);
      } finally {
        client.release();
        await pool.end();
      }
    }
  });

  it('progresses order state sequentially and writes append-only order_events timeline', async () => {
    if (!hasDb || !db || !api || !testOrderId) return;

    // 1. Transition PENDING_PAYMENT -> PAID
    const payResult = await transitionOrderState(
      db,
      testOrderId,
      { type: 'PAYMENT_RECEIVED', transactionId: 'tx_pay_1', amount: '500.00' },
      { type: 'SYSTEM' },
    );
    expect(payResult.order.state).toBe('PAID');

    // 2. Transition PAID -> IN_FULFILLMENT
    const fulResult = await transitionOrderState(
      db,
      testOrderId,
      { type: 'FULFILLMENT_STARTED' },
      { type: 'ADMIN' },
    );
    expect(fulResult.order.state).toBe('IN_FULFILLMENT');

    // 3. Transition IN_FULFILLMENT -> FULFILLED
    const doneResult = await transitionOrderState(
      db,
      testOrderId,
      { type: 'FULFILLMENT_COMPLETED', trackingNumber: 'MG-TRACK-999' },
      { type: 'ADMIN' },
    );
    expect(doneResult.order.state).toBe('FULFILLED');

    // 4. Fetch timeline via repository
    const timeline = await getOrderEvents(db, testOrderId);
    expect(timeline.length).toBe(4); // initial + 3 transitions
    expect(timeline[0]?.to_state).toBe('PENDING_PAYMENT');
    expect(timeline[1]?.to_state).toBe('PAID');
    expect(timeline[2]?.to_state).toBe('IN_FULFILLMENT');
    expect(timeline[3]?.to_state).toBe('FULFILLED');

    // 5. Fetch timeline via API
    const apiRes = await api(
      new Request(`http://localhost/orders/${testOrderId}/events`, { method: 'GET' }),
    );
    expect(apiRes.status).toBe(200);
    const apiJson = await apiRes.json();
    expect(apiJson.data.length).toBe(4);
  });

  it('rejects illegal transition attempts and preserves order immutability', async () => {
    if (!hasDb || !db || !testOrderId) return;

    // testOrderId is now FULFILLED (terminal). Transitioning back to PAID must throw.
    await expect(
      transitionOrderState(
        db,
        testOrderId,
        { type: 'PAYMENT_RECEIVED', transactionId: 'tx_illegal', amount: '100.00' },
        { type: 'SYSTEM' },
      ),
    ).rejects.toThrow('Illegal order transition');

    // Ensure timeline was not polluted
    const timeline = await getOrderEvents(db, testOrderId);
    expect(timeline.length).toBe(4);
  });

  it('cancels pending order via cancel endpoint and records cancellation event', async () => {
    if (!hasDb || !db || !api || !cancelOrderId) return;

    const cancelRes = await api(
      new Request(`http://localhost/orders/${cancelOrderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Found alternative gemstone' }),
      }),
    );
    expect(cancelRes.status).toBe(200);
    const cancelJson = await cancelRes.json();
    expect(cancelJson.data.state).toBe('CANCELLED');

    // Verify timeline includes CANCELLED event
    const events = await getOrderEvents(db, cancelOrderId);
    expect(events.some((e) => e.to_state === 'CANCELLED' && e.reason?.includes('alternative'))).toBe(true);
  });
});
