import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createCatalogDatabase,
  createCatalogQueryPort,
  createPool,
  createProductAddon,
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

describe('Product Add-ons: Protection Plan & Financing (Phase 6 Task 9)', () => {
  let pool: ReturnType<typeof createPool> | undefined;
  let db: CatalogDatabase | undefined;
  let api: CatalogApi | undefined;
  let hasDb = false;
  let customerId: string | undefined;
  let sampleOrderPendingId: string | undefined;
  let sampleOrderPaidId: string | undefined;
  let protectionAddonId: string | undefined;
  let financingAddonId: string | undefined;
  const createdAddonCodes: string[] = [];

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
        email: `test_addons_${Date.now()}@example.com`,
        first_name: 'Addon',
        last_name: 'Customer',
      });
      customerId = cust.id;

      // Seed 2 add-ons
      const protCode = `PROT-${Date.now()}`;
      const finCode = `FIN-${Date.now()}`;
      createdAddonCodes.push(protCode, finCode);

      const prot = await createProductAddon(db, {
        addon_type: 'PROTECTION_PLAN',
        code: protCode,
        name: '2-Year Comprehensive Jewelry Protection',
        price: 149.0,
      });
      protectionAddonId = prot.id;

      const fin = await createProductAddon(db, {
        addon_type: 'FINANCING',
        code: finCode,
        name: '12-Month 0% APR Financing Service',
        price: 50.0,
      });
      financingAddonId = fin.id;

      // Create a test pending order
      const client = await pool.connect();
      const pendingRes = await client.query(`
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
          'addon_test@example.com',
          'PENDING_PAYMENT',
          'USD',
          1000.00,
          1000.00,
          '{}'::jsonb,
          '{"full_name":"Test","line1":"1 St","city":"NYC","postal_code":"10001","country_code":"US"}'::jsonb
        )
        RETURNING id;
      `, [`MG-TEST-ADDON-${Date.now()}`, customerId]);
      sampleOrderPendingId = pendingRes.rows[0].id;

      // Create a test paid order (immutable)
      const paidRes = await client.query(`
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
          'addon_test_paid@example.com',
          'PAID',
          'USD',
          2000.00,
          2000.00,
          '{}'::jsonb,
          '{"full_name":"Test","line1":"1 St","city":"NYC","postal_code":"10001","country_code":"US"}'::jsonb
        )
        RETURNING id;
      `, [`MG-TEST-PAID-${Date.now()}`, customerId]);
      sampleOrderPaidId = paidRes.rows[0].id;

      client.release();
      hasDb = true;
    } catch (err) {
      console.error('Database setup failed for addon.spec.ts:', err);
      hasDb = false;
    }
  });

  afterAll(async () => {
    if (pool && hasDb) {
      const client = await pool.connect();
      try {
        if (sampleOrderPendingId) {
          await client.query(`DELETE FROM order_events WHERE order_id = $1`, [sampleOrderPendingId]);
          await client.query(`DELETE FROM order_items WHERE order_id = $1`, [sampleOrderPendingId]);
          await client.query(`DELETE FROM orders WHERE id = $1`, [sampleOrderPendingId]);
        }
        if (sampleOrderPaidId) {
          await client.query(`DELETE FROM order_events WHERE order_id = $1`, [sampleOrderPaidId]);
          await client.query(`DELETE FROM order_items WHERE order_id = $1`, [sampleOrderPaidId]);
          await client.query(`DELETE FROM orders WHERE id = $1`, [sampleOrderPaidId]);
        }
        for (const code of createdAddonCodes) {
          await client.query(`DELETE FROM product_addons WHERE code = $1`, [code]);
        }
        if (customerId) {
          await client.query(`DELETE FROM customer_profiles WHERE customer_id = $1`, [customerId]);
          await client.query(`DELETE FROM customers WHERE id = $1`, [customerId]);
        }
      } catch (e) {
        console.error('Addon cleanup error:', e);
      } finally {
        client.release();
        await pool.end();
      }
    }
  });

  it('lists active addons and retrieves addon details', async () => {
    if (!hasDb || !api || !protectionAddonId) return;

    // 1. List addons
    const listRes = await api(
      new Request('http://localhost/addons', { method: 'GET' }),
    );
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(Array.isArray(listJson.data)).toBe(true);
    expect(listJson.data.some((a: any) => a.id === protectionAddonId)).toBe(true);

    // 2. Get specific addon
    const getRes = await api(
      new Request(`http://localhost/addons/${protectionAddonId}`, { method: 'GET' }),
    );
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.data.id).toBe(protectionAddonId);
    expect(getJson.data.addon_type).toBe('PROTECTION_PLAN');
    expect(getJson.data.price).toBe('149.00');
  });

  it('attaches protection plan addon as a separate order line and recalculates order totals', async () => {
    if (!hasDb || !api || !sampleOrderPendingId || !protectionAddonId) return;

    const attachRes = await api(
      new Request(`http://localhost/orders/${sampleOrderPendingId}/addons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addon_id: protectionAddonId,
        }),
      }),
    );
    expect(attachRes.status).toBe(201);
    const attachJson = await attachRes.json();
    expect(attachJson.data.addon_item_id).toBeDefined();

    // Check updated order
    const updatedOrder = attachJson.data.order;
    expect(updatedOrder.subtotal).toBe('1149.00');
    expect(updatedOrder.grand_total).toBe('1149.00');

    // Addon is attached as a separate order line
    const addonLine = updatedOrder.items.find((i: any) => i.id === attachJson.data.addon_item_id);
    expect(addonLine).toBeDefined();
    expect(addonLine.unit_price).toBe('149.00');
    expect(addonLine.line_total).toBe('149.00');
    expect(addonLine.sku_snapshot).toContain('PROT-');
  });

  it('rejects attaching an addon to an order that is not PENDING_PAYMENT (immutability)', async () => {
    if (!hasDb || !api || !sampleOrderPaidId || !financingAddonId) return;

    const rejectRes = await api(
      new Request(`http://localhost/orders/${sampleOrderPaidId}/addons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addon_id: financingAddonId,
        }),
      }),
    );
    expect(rejectRes.status).toBe(422);
    const rejectJson = await rejectRes.json();
    expect(rejectJson.error.code).toBe('UNPROCESSABLE');
    expect(rejectJson.error.message).toContain('immutable');
  });
});
