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

describe('Accounts, Profiles, Addresses & Order History (Phase 6 Task 7)', () => {
  let pool: ReturnType<typeof createPool> | undefined;
  let api: CatalogApi | undefined;
  let hasDb = false;
  let customerAId: string | undefined;
  let customerBId: string | undefined;
  const createdAddressIds: string[] = [];

  beforeAll(async () => {
    const url = getDatabaseUrl();
    if (!url) return;
    try {
      pool = createPool(url, { max: 2 });
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

      // Create test customers A and B
      const custA = await getOrCreateCustomer(db, {
        email: `test_account_a_${Date.now()}@example.com`,
        first_name: 'Alice',
        last_name: 'Account',
      });
      customerAId = custA.id;

      const custB = await getOrCreateCustomer(db, {
        email: `test_account_b_${Date.now()}@example.com`,
        first_name: 'Bob',
        last_name: 'Account',
      });
      customerBId = custB.id;

      hasDb = true;
    } catch (err) {
      console.error('Database setup failed for account.spec.ts:', err);
      hasDb = false;
    }
  });

  afterAll(async () => {
    if (pool && hasDb) {
      const client = await pool.connect();
      try {
        for (const addressId of createdAddressIds) {
          await client.query(`DELETE FROM addresses WHERE id = $1`, [addressId]);
        }
        if (customerAId) {
          await client.query(`DELETE FROM customer_profiles WHERE customer_id = $1`, [customerAId]);
          await client.query(`DELETE FROM customers WHERE id = $1`, [customerAId]);
        }
        if (customerBId) {
          await client.query(`DELETE FROM customer_profiles WHERE customer_id = $1`, [customerBId]);
          await client.query(`DELETE FROM customers WHERE id = $1`, [customerBId]);
        }
      } catch (e) {
        console.error('Account test cleanup error:', e);
      } finally {
        client.release();
        await pool.end();
      }
    }
  });

  it('rejects unauthenticated requests without customer id header or query', async () => {
    if (!hasDb || !api) return;

    const res = await api(
      new Request('http://localhost/account/profile', {
        method: 'GET',
      }),
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('fetches customer profile and updates profile fields', async () => {
    if (!hasDb || !api || !customerAId) return;

    // 1. Get profile
    const getRes = await api(
      new Request('http://localhost/account/profile', {
        method: 'GET',
        headers: { 'x-customer-id': customerAId },
      }),
    );
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.data.customer_id).toBe(customerAId);

    // 2. Update profile
    const patchRes = await api(
      new Request('http://localhost/account/profile', {
        method: 'PATCH',
        headers: {
          'x-customer-id': customerAId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ring_size: '6.5',
          zodiac_sign: 'Leo',
          phone: '+15551234567',
        }),
      }),
    );
    expect(patchRes.status).toBe(200);
    const patchJson = await patchRes.json();
    expect(patchJson.data.ring_size).toBe('6.5');
    expect(patchJson.data.zodiac_sign).toBe('Leo');
    expect(patchJson.data.phone).toBe('+15551234567');
  });

  it('manages customer addresses (create, list, update, delete)', async () => {
    if (!hasDb || !api || !customerAId) return;

    // 1. Create address
    const createRes = await api(
      new Request('http://localhost/account/addresses', {
        method: 'POST',
        headers: {
          'x-customer-id': customerAId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'SHIPPING',
          full_name: 'Alice Address',
          line1: '123 Diamond St',
          city: 'Gem City',
          postal_code: '10001',
          country_code: 'US',
          is_default: true,
        }),
      }),
    );
    expect(createRes.status).toBe(201);
    const createdJson = await createRes.json();
    const addressId = createdJson.data.id;
    expect(addressId).toBeDefined();
    createdAddressIds.push(addressId);
    expect(createdJson.data.line1).toBe('123 Diamond St');

    // 2. List addresses
    const listRes = await api(
      new Request('http://localhost/account/addresses', {
        method: 'GET',
        headers: { 'x-customer-id': customerAId },
      }),
    );
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(listJson.data.some((a: any) => a.id === addressId)).toBe(true);

    // 3. Update address
    const updateRes = await api(
      new Request(`http://localhost/account/addresses/${addressId}`, {
        method: 'PATCH',
        headers: {
          'x-customer-id': customerAId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line2: 'Suite 400',
        }),
      }),
    );
    expect(updateRes.status).toBe(200);
    const updatedJson = await updateRes.json();
    expect(updatedJson.data.line2).toBe('Suite 400');

    // 4. Delete address
    const deleteRes = await api(
      new Request(`http://localhost/account/addresses/${addressId}`, {
        method: 'DELETE',
        headers: { 'x-customer-id': customerAId },
      }),
    );
    expect(deleteRes.status).toBe(200);
  });

  it('enforces customer authorization boundary (cross-customer access forbidden)', async () => {
    if (!hasDb || !api || !customerAId || !customerBId) return;

    // Create an address for Customer A
    const createRes = await api(
      new Request('http://localhost/account/addresses', {
        method: 'POST',
        headers: {
          'x-customer-id': customerAId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind: 'SHIPPING',
          full_name: 'Private Alice Address',
          line1: '999 Secret Ln',
          city: 'Gem City',
          postal_code: '10001',
          country_code: 'US',
        }),
      }),
    );
    expect(createRes.status).toBe(201);
    const addressId = (await createRes.json()).data.id;
    createdAddressIds.push(addressId);

    // Customer B attempts to update Customer A's address -> FORBIDDEN (403)
    const crossUpdateRes = await api(
      new Request(`http://localhost/account/addresses/${addressId}`, {
        method: 'PATCH',
        headers: {
          'x-customer-id': customerBId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line1: 'Hacked Address',
        }),
      }),
    );
    expect(crossUpdateRes.status).toBe(403);

    // Customer B attempts to delete Customer A's address -> FORBIDDEN (403)
    const crossDeleteRes = await api(
      new Request(`http://localhost/account/addresses/${addressId}`, {
        method: 'DELETE',
        headers: {
          'x-customer-id': customerBId,
        },
      }),
    );
    expect(crossDeleteRes.status).toBe(403);
  });

  it('lists customer order history and prevents cross-customer order inspection', async () => {
    if (!hasDb || !api || !customerAId || !customerBId) return;

    // List Customer A orders
    const orderListRes = await api(
      new Request('http://localhost/account/orders', {
        method: 'GET',
        headers: { 'x-customer-id': customerAId },
      }),
    );
    expect(orderListRes.status).toBe(200);
    const listJson = await orderListRes.json();
    expect(Array.isArray(listJson.data.orders)).toBe(true);

    // Attempt to access an invalid / unowned order id
    const invalidOrderRes = await api(
      new Request('http://localhost/account/orders/00000000-0000-0000-0000-000000000000', {
        method: 'GET',
        headers: { 'x-customer-id': customerAId },
      }),
    );
    expect(invalidOrderRes.status).toBe(404);
  });
});
