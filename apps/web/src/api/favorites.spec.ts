import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCatalogDatabase, createCatalogQueryPort, createPool, getOrCreateCustomer } from '@maihan/db';
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

describe('Wishlist (/favorites) & Compare-list (/compare) (Phase 6 Task 8)', () => {
  let pool: ReturnType<typeof createPool> | undefined;
  let api: CatalogApi | undefined;
  let hasDb = false;
  let customerId: string | undefined;
  let sampleProductA: string | undefined;
  let sampleProductB: string | undefined;

  beforeAll(async () => {
    const url = getDatabaseUrl();
    if (!url) return;
    try {
      pool = createPool(url, { max: 2 });
      const client = await pool.connect();

      // Find two active products to test with
      const res = await client.query(`
        SELECT p.id
        FROM products p
        JOIN gemstones g ON g.id = p.gemstone_id
        WHERE p.state = 'ACTIVE'
        LIMIT 2;
      `);
      if (res.rows.length >= 2) {
        sampleProductA = res.rows[0].id;
        sampleProductB = res.rows[1].id;
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

      const cust = await getOrCreateCustomer(db, {
        email: `test_fav_${Date.now()}@example.com`,
        first_name: 'Fav',
        last_name: 'Tester',
      });
      customerId = cust.id;

      hasDb = true;
    } catch (err) {
      console.error('Database setup failed for favorites.spec.ts:', err);
      hasDb = false;
    }
  });

  afterAll(async () => {
    if (pool && hasDb) {
      const client = await pool.connect();
      try {
        if (customerId) {
          await client.query(`DELETE FROM favorites WHERE customer_id = $1`, [customerId]);
          await client.query(`DELETE FROM customer_profiles WHERE customer_id = $1`, [customerId]);
          await client.query(`DELETE FROM customers WHERE id = $1`, [customerId]);
        }
      } catch (e) {
        console.error('Favorites test cleanup error:', e);
      } finally {
        client.release();
        await pool.end();
      }
    }
  });

  it('rejects unauthorized access to /favorites without customer id', async () => {
    if (!hasDb || !api) return;

    const res = await api(
      new Request('http://localhost/favorites', {
        method: 'GET',
      }),
    );
    expect(res.status).toBe(401);
  });

  it('adds product to favorites, lists favorites, and removes product', async () => {
    if (!hasDb || !api || !customerId || !sampleProductA) return;

    // 1. Initial list is empty
    const initRes = await api(
      new Request('http://localhost/favorites', {
        method: 'GET',
        headers: { 'x-customer-id': customerId },
      }),
    );
    expect(initRes.status).toBe(200);
    const initJson = await initRes.json();
    expect(initJson.data).toEqual([]);

    // 2. Add product A
    const addRes = await api(
      new Request('http://localhost/favorites', {
        method: 'POST',
        headers: {
          'x-customer-id': customerId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_id: sampleProductA }),
      }),
    );
    expect(addRes.status).toBe(201);
    const addJson = await addRes.json();
    expect(addJson.data.length).toBe(1);
    expect(addJson.data[0].id).toBe(sampleProductA);
    expect(addJson.data[0].sku).toBeDefined();

    // 3. List favorites reflects added product
    const listRes = await api(
      new Request('http://localhost/favorites', {
        method: 'GET',
        headers: { 'x-customer-id': customerId },
      }),
    );
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(listJson.data.length).toBe(1);
    expect(listJson.data[0].id).toBe(sampleProductA);

    // 4. Remove product A
    const removeRes = await api(
      new Request(`http://localhost/favorites/${sampleProductA}`, {
        method: 'DELETE',
        headers: { 'x-customer-id': customerId },
      }),
    );
    expect(removeRes.status).toBe(200);
    const removeJson = await removeRes.json();
    expect(removeJson.data).toEqual([]);
  });

  it('validates product count on /compare and generates attribute matrix', async () => {
    if (!hasDb || !api || !sampleProductA || !sampleProductB) return;

    // 1. Single product returns validation failure
    const singleRes = await api(
      new Request(`http://localhost/compare?ids=${sampleProductA}`, {
        method: 'GET',
      }),
    );
    expect(singleRes.status).toBe(400);

    // 2. Comparing 2 products succeeds with side-by-side attributes matrix
    const compareRes = await api(
      new Request(`http://localhost/compare?ids=${sampleProductA},${sampleProductB}`, {
        method: 'GET',
      }),
    );
    expect(compareRes.status).toBe(200);
    const compareJson = await compareRes.json();
    expect(compareJson.data.products.length).toBe(2);
    expect(compareJson.data.products[0].id).toBe(sampleProductA);
    expect(compareJson.data.products[1].id).toBe(sampleProductB);

    // Attributes matrix has price, variety, carat weight, etc.
    expect(Array.isArray(compareJson.data.attributes)).toBe(true);
    const priceAttr = compareJson.data.attributes.find((a: any) => a.key === 'price');
    expect(priceAttr).toBeDefined();
    expect(priceAttr.values[sampleProductA]).toBeDefined();
    expect(priceAttr.values[sampleProductB]).toBeDefined();
  });
});
