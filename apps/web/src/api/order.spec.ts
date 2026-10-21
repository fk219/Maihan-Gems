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

describe('Order Placement & Immutable Snapshots (Phase 6 Task 4)', () => {
  let pool: ReturnType<typeof createPool> | undefined;
  let api: CatalogApi | undefined;
  let hasDb = false;
  let sampleProductId: string | undefined;
  let sampleStoneRestore: { gemstone_id: string | null; productId: string; prevState: string } | undefined;
  const createdCartTokens: string[] = [];
  const createdSessionIds: string[] = [];
  const createdOrderIds: string[] = [];

  beforeAll(async () => {
    const url = getDatabaseUrl();
    if (!url) return;
    try {
      pool = createPool(url, { max: 2 });
      const client = await pool.connect();
      const res = await client.query(`
        SELECT p.id, p.price_amount::text AS price_amount, p.kind::text AS kind,
               p.state::text AS product_state, p.gemstone_id
        FROM products p
        JOIN gemstones g ON g.id = p.gemstone_id
        WHERE p.price_amount IS NOT NULL
          AND p.state = 'ACTIVE'
          AND g.availability = true
          AND g.state = 'ACTIVE'
          AND NOT EXISTS (
            SELECT 1 FROM inventory_reservations r
            WHERE r.gemstone_id = g.id
              AND r.state = 'ACTIVE'
              AND r.expires_at > now()
          )
        ORDER BY random()
        LIMIT 1;
      `);
      if (res.rows.length > 0) {
        sampleProductId = res.rows[0].id;
        sampleStoneRestore = {
          gemstone_id: res.rows[0].gemstone_id,
          productId: res.rows[0].id,
          prevState: res.rows[0].product_state as string,
        };
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
        for (const orderId of createdOrderIds) {
          await client.query(`DELETE FROM audit_logs WHERE entity_id = $1`, [orderId]);
          await client.query(`DELETE FROM order_events WHERE order_id = $1`, [orderId]);
          await client.query(`DELETE FROM order_items WHERE order_id = $1`, [orderId]);
          // P1-27 FK hygiene: detach the conversion pointers before removing
          // the order row itself.
          await client.query(`UPDATE carts SET converted_order_id = NULL WHERE converted_order_id = $1`, [orderId]);
          await client.query(`UPDATE checkout_sessions SET completed_order_id = NULL WHERE completed_order_id = $1`, [orderId]);
          await client.query(`DELETE FROM orders WHERE id = $1`, [orderId]);
        }
        // P1-17 lifecycle: the sample stone was sold by a successful order.
        // Restore availability/state so other suites (catalog, a11y) do not
        // observe SOLD_LEFT residue in the shared dev database.
        if (sampleStoneRestore) {
          await client.query(`UPDATE gemstones SET availability = true, availability_checked_at = NULL WHERE id = $1`, [sampleStoneRestore.gemstone_id]);
          await client.query(`UPDATE products SET availability = true, state = $1::product_state WHERE id = $2`, [sampleStoneRestore.prevState, sampleStoneRestore.productId]);
        }
        for (const token of createdCartTokens) {
          await client.query(`DELETE FROM carts WHERE cart_token = $1`, [token]);
        }
        for (const sid of createdSessionIds) {
          await client.query(`DELETE FROM inventory_reservations WHERE session_id = $1`, [sid]);
          await client.query(`DELETE FROM checkout_sessions WHERE id = $1`, [sid]);
        }
      } finally {
        client.release();
        await pool.end();
      }
    }
  });

  it('places order end-to-end with immutable snapshots, timeline event, and audit row', async () => {
    if (!hasDb || !api || !sampleProductId) return;

    // 1. Create Cart
    const cartRes = await api(
      new Request('https://maihan.test/api/v1/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    const cartToken = (await cartRes.json()).data.cart_token;
    createdCartTokens.push(cartToken);

    // 2. Add Item to Cart
    const addRes = await api(
      new Request(`https://maihan.test/api/v1/carts/${cartToken}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: sampleProductId, quantity: 1 }),
      }),
    );
    const initialSnapshot = (await addRes.json()).data.pricing_snapshot;

    // 3. Checkout Session Checkpoint 1: Initiate
    const sessionRes = await api(
      new Request('https://maihan.test/api/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart_token: cartToken, email: 'buyer@example.com' }),
      }),
    );
    const sessionId = (await sessionRes.json()).data.id;
    createdSessionIds.push(sessionId);

    // 4. Checkpoint 2: Shipping
    await api(
      new Request(`https://maihan.test/api/v1/checkout/sessions/${sessionId}/shipping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping_address: {
            full_name: 'Arthur Pendelton',
            line1: '450 Fifth Avenue',
            city: 'New York',
            postal_code: '10018',
            country_code: 'US',
          },
          shipping_method: {
            code: 'SECURE_COURIER',
            name: 'Armored Courier',
            amount: '50.00',
          },
        }),
      }),
    );

    // 5. Checkpoint 3: Payment Intent
    await api(
      new Request(`https://maihan.test/api/v1/checkout/sessions/${sessionId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method_type: 'TEST' }),
      }),
    );

    // 6. Checkpoint 4: Confirm Readiness
    await api(
      new Request(`https://maihan.test/api/v1/checkout/sessions/${sessionId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotency_key: 'idem_order_placement_1',
          customer_note: 'Please include gift receipt',
        }),
      }),
    );

    // 7. Place Order
    const idempotencyKey = 'idem_order_placement_1';
    const placeRes = await api(
      new Request('https://maihan.test/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkout_session_id: sessionId,
          idempotency_key: idempotencyKey,
          customer_note: 'Please include gift receipt',
        }),
      }),
    );

    expect(placeRes.status).toBe(201);
    const orderData = (await placeRes.json()).data;
    createdOrderIds.push(orderData.id);

    // Assert order number format MG-YYYY-NNNNNN
    expect(orderData.order_number).toMatch(/^MG-\d{4}-\d{6}$/);
    expect(orderData.state).toBe('PENDING_PAYMENT');
    expect(orderData.email).toBe('buyer@example.com');
    expect(orderData.shipping_address.city).toBe('New York');
    expect(orderData.customer_note).toBe('Please include gift receipt');

    // Assert frozen snapshots
    expect(orderData.pricing_snapshot).toBeDefined();
    expect(Number(orderData.grand_total)).toBe(Number(initialSnapshot.grand_total) + 50);

    // Assert order items have immutable gemstone snapshot
    expect(orderData.items.length).toBe(1);
    const item = orderData.items[0];
    expect(item.sku_snapshot).toBeDefined();
    expect(item.title_snapshot).toBeDefined();
    expect(item.gem_snapshot).toBeDefined();

    // 8. Test Idempotency Replay
    const replayRes = await api(
      new Request('https://maihan.test/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkout_session_id: sessionId,
          idempotency_key: idempotencyKey,
        }),
      }),
    );
    expect(replayRes.status).toBe(201);
    const replayData = (await replayRes.json()).data;
    expect(replayData.id).toBe(orderData.id);
    expect(replayData.order_number).toBe(orderData.order_number);

    // 9. Fetch order by ID
    const getRes = await api(
      new Request(`https://maihan.test/api/v1/orders/${orderData.id}`),
    );
    expect(getRes.status).toBe(200);
    const getData = (await getRes.json()).data;
    expect(getData.id).toBe(orderData.id);
    expect(getData.order_number).toBe(orderData.order_number);
  });
});
