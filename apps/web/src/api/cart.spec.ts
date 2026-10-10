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

describe('Cart HTTP API Endpoints (Phase 6 Task 1)', () => {
  let pool: ReturnType<typeof createPool> | undefined;
  let api: CatalogApi | undefined;
  let hasDb = false;
  let sampleProductId: string | undefined;
  let sampleProductPrice: string | undefined;
  const createdCartTokens: string[] = [];

  beforeAll(async () => {
    const url = getDatabaseUrl();
    if (!url) return;
    try {
      pool = createPool(url, { max: 2 });
      const client = await pool.connect();
      const res = await client.query(`
        SELECT id, price_amount::text AS price_amount
        FROM products
        WHERE price_amount IS NOT NULL
          AND state = 'ACTIVE'
        LIMIT 1
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

      api = createCatalogApi({ service, db });
      hasDb = true;
    } catch {
      hasDb = false;
    }
  });

  afterAll(async () => {
    if (pool && createdCartTokens.length > 0) {
      try {
        const client = await pool.connect();
        for (const token of createdCartTokens) {
          await client.query('DELETE FROM carts WHERE cart_token = $1', [token]);
        }
        client.release();
      } catch {}
    }
    if (pool) {
      await pool.end().catch(() => {});
    }
  });

  it('POST /api/v1/carts creates a new cart and returns 201 envelope', async () => {
    if (!hasDb || !api) return;

    const request = new Request('http://localhost/api/v1/carts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ anonymous_session_id: 'guest_spec_1' }),
    });

    const response = await api(request);
    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toContain('private');

    const json = (await response.json()) as { data: { cart_token: string; state: string } };
    expect(json.data.cart_token).toMatch(/^cart_/);
    expect(json.data.state).toBe('ACTIVE');
    createdCartTokens.push(json.data.cart_token);
  });

  it('GET /api/v1/carts/{cartToken} retrieves cart and returns 200 envelope', async () => {
    if (!hasDb || !api) return;

    // Create cart first
    const createReq = new Request('http://localhost/api/v1/carts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const createRes = await api(createReq);
    const createJson = (await createRes.json()) as { data: { cart_token: string } };
    const cartToken = createJson.data.cart_token;
    createdCartTokens.push(cartToken);

    const getReq = new Request(`http://localhost/api/v1/carts/${cartToken}`, { method: 'GET' });
    const getRes = await api(getReq);
    expect(getRes.status).toBe(200);
    const getJson = (await getRes.json()) as { data: { cart_token: string; items: unknown[] } };
    expect(getJson.data.cart_token).toBe(cartToken);
    expect(getJson.data.items).toEqual([]);
  });

  it('POST /api/v1/carts/{cartToken}/items rejects tampered price with 409 PRICE_CHANGED', async () => {
    if (!hasDb || !api || !sampleProductId || !sampleProductPrice) return;

    const createReq = new Request('http://localhost/api/v1/carts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const createRes = await api(createReq);
    const createJson = (await createRes.json()) as { data: { cart_token: string } };
    const cartToken = createJson.data.cart_token;
    createdCartTokens.push(cartToken);

    // Tampered price
    const addReq = new Request(`http://localhost/api/v1/carts/${cartToken}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        product_id: sampleProductId,
        quantity: 1,
        expected_unit_price: '0.01',
      }),
    });

    const addRes = await api(addReq);
    expect(addRes.status).toBe(409);
    const errorJson = (await addRes.json()) as { error: { code: string; details: Array<{ authoritative: string }> } };
    expect(errorJson.error.code).toBe('PRICE_CHANGED');
    expect(errorJson.error.details[0]?.authoritative).toBe(sampleProductPrice);
  });

  it('POST /api/v1/carts/{cartToken}/items adds item when price matches and recalculates subtotal', async () => {
    if (!hasDb || !api || !sampleProductId || !sampleProductPrice) return;

    const createReq = new Request('http://localhost/api/v1/carts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const createRes = await api(createReq);
    const createJson = (await createRes.json()) as { data: { cart_token: string } };
    const cartToken = createJson.data.cart_token;
    createdCartTokens.push(cartToken);

    const addReq = new Request(`http://localhost/api/v1/carts/${cartToken}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        product_id: sampleProductId,
        quantity: 2,
        expected_unit_price: sampleProductPrice,
      }),
    });

    const addRes = await api(addReq);
    expect(addRes.status).toBe(200);
    const json = (await addRes.json()) as {
      data: {
        items: Array<{ id: string; quantity: number; unit_price: string }>;
        pricing_snapshot: { subtotal: string; item_count: number };
      };
    };
    expect(json.data.items).toHaveLength(1);
    expect(json.data.items[0]?.quantity).toBe(2);
    expect(json.data.items[0]?.unit_price).toBe(sampleProductPrice);

    const expectedSubtotal = (Number(sampleProductPrice) * 2).toFixed(2);
    expect(json.data.pricing_snapshot.subtotal).toBe(expectedSubtotal);
    expect(json.data.pricing_snapshot.item_count).toBe(2);
  });

  it('PATCH /api/v1/carts/{cartToken}/items/{itemId} updates quantity', async () => {
    if (!hasDb || !api || !sampleProductId || !sampleProductPrice) return;

    const createReq = new Request('http://localhost/api/v1/carts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const createRes = await api(createReq);
    const createJson = (await createRes.json()) as { data: { cart_token: string } };
    const cartToken = createJson.data.cart_token;
    createdCartTokens.push(cartToken);

    const addReq = new Request(`http://localhost/api/v1/carts/${cartToken}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        product_id: sampleProductId,
        quantity: 1,
      }),
    });
    const addRes = await api(addReq);
    const addJson = (await addRes.json()) as { data: { items: Array<{ id: string }> } };
    const itemId = addJson.data.items[0]!.id;

    const patchReq = new Request(`http://localhost/api/v1/carts/${cartToken}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        quantity: 3,
        expected_unit_price: sampleProductPrice,
      }),
    });

    const patchRes = await api(patchReq);
    expect(patchRes.status).toBe(200);
    const patchJson = (await patchRes.json()) as { data: { items: Array<{ quantity: number }> } };
    expect(patchJson.data.items[0]?.quantity).toBe(3);
  });

  it('DELETE /api/v1/carts/{cartToken}/items/{itemId} removes item', async () => {
    if (!hasDb || !api || !sampleProductId) return;

    const createReq = new Request('http://localhost/api/v1/carts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const createRes = await api(createReq);
    const createJson = (await createRes.json()) as { data: { cart_token: string } };
    const cartToken = createJson.data.cart_token;
    createdCartTokens.push(cartToken);

    const addReq = new Request(`http://localhost/api/v1/carts/${cartToken}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        product_id: sampleProductId,
        quantity: 1,
      }),
    });
    const addRes = await api(addReq);
    const addJson = (await addRes.json()) as { data: { items: Array<{ id: string }> } };
    const itemId = addJson.data.items[0]!.id;

    const delReq = new Request(`http://localhost/api/v1/carts/${cartToken}/items/${itemId}`, {
      method: 'DELETE',
    });
    const delRes = await api(delReq);
    expect(delRes.status).toBe(200);
    const delJson = (await delRes.json()) as { data: { items: unknown[]; pricing_snapshot: { item_count: number } } };
    expect(delJson.data.items).toHaveLength(0);
    expect(delJson.data.pricing_snapshot.item_count).toBe(0);
  });

  it('POST /api/v1/carts/{cartToken}/merge merges guest cart into customer cart', async () => {
    if (!hasDb || !api || !sampleProductId) return;

    // Create guest cart
    const guestCreate = await api(
      new Request('http://localhost/api/v1/carts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ anonymous_session_id: 'guest_merge_test' }),
      }),
    );
    const guestJson = (await guestCreate.json()) as { data: { cart_token: string } };
    const guestToken = guestJson.data.cart_token;
    createdCartTokens.push(guestToken);

    // Add item to guest cart
    await api(
      new Request(`http://localhost/api/v1/carts/${guestToken}/items`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product_id: sampleProductId, quantity: 1 }),
      }),
    );

    // Create customer cart
    const custCreate = await api(
      new Request('http://localhost/api/v1/carts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    const custJson = (await custCreate.json()) as { data: { cart_token: string } };
    const customerToken = custJson.data.cart_token;
    createdCartTokens.push(customerToken);

    // Merge guest into customer
    const mergeRes = await api(
      new Request(`http://localhost/api/v1/carts/${customerToken}/merge`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ guest_cart_token: guestToken }),
      }),
    );
    expect(mergeRes.status).toBe(200);
    const mergeJson = (await mergeRes.json()) as { data: { items: Array<{ product_id: string }> } };
    expect(mergeJson.data.items).toHaveLength(1);
    expect(mergeJson.data.items[0]?.product_id).toBe(sampleProductId);
  });
});
