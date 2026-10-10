import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { createCatalogDatabase } from '../catalog/executor.js';
import {
  createCart,
  addItemToCart,
} from './cart-repository.js';
import {
  createCheckoutSession,
  getCheckoutSession,
} from './checkout-session-repository.js';
import {
  releaseStockForSession,
  isGemstoneReserved,
} from './inventory-reservation.js';
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
  const localEnv = resolve(process.cwd(), '.env');
  if (existsSync(localEnv)) {
    const content = readFileSync(localEnv, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        return trimmed.slice('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return undefined;
}

describe('Checkout Session & Inventory Reservation (Phase 6 Task 2)', () => {
  let pool: Pool | undefined;
  let db: ReturnType<typeof createCatalogDatabase> | undefined;
  let hasDb = false;
  let sampleProductId: string | undefined;
  let sampleGemstoneId: string | undefined;
  const createdCartTokens: string[] = [];
  const createdSessionIds: string[] = [];

  beforeAll(async () => {
    const url = getDatabaseUrl();
    if (!url) return;
    try {
      pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 5000 });
      const client = await pool.connect();
      const res = await client.query(`
        SELECT p.id, p.price_amount::text AS price_amount, p.gemstone_id
        FROM products p
        JOIN gemstones g ON g.id = p.gemstone_id
        WHERE p.price_amount IS NOT NULL
          AND p.state = 'ACTIVE'
          AND g.availability = true
          AND g.state = 'ACTIVE'
        LIMIT 1;
      `);
      client.release();
      if (res.rows.length > 0) {
        sampleProductId = res.rows[0].id;
        sampleGemstoneId = res.rows[0].gemstone_id;
        db = createCatalogDatabase(pool);
        hasDb = true;
      }
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

  it('rejects checkout session on empty cart with UNPROCESSABLE', async () => {
    if (!hasDb || !db) return;
    const cart = await createCart(db);
    createdCartTokens.push(cart.cart_token);

    await expect(
      createCheckoutSession(db, {
        cart_token: cart.cart_token,
      }),
    ).rejects.toMatchObject({
      code: 'UNPROCESSABLE',
    });
  });

  it('rejects checkout session when client expected_total mismatches server price (409 PRICE_CHANGED)', async () => {
    if (!hasDb || !db || !sampleProductId) return;
    const cart = await createCart(db);
    createdCartTokens.push(cart.cart_token);

    await addItemToCart(db, cart.cart_token, {
      product_id: sampleProductId,
      quantity: 1,
    });

    const tamperedExpectedTotal = '1.00'; // Deliberate mismatch

    await expect(
      createCheckoutSession(db, {
        cart_token: cart.cart_token,
        expected_total: tamperedExpectedTotal,
      }),
    ).rejects.toMatchObject({
      code: 'PRICE_CHANGED',
      details: expect.arrayContaining([
        expect.objectContaining({
          field: 'expected_total',
          expected: tamperedExpectedTotal,
        }),
      ]),
    });
  });

  it('successfully creates checkout session, freezes price snapshot, and reserves stock', async () => {
    if (!hasDb || !db || !sampleProductId || !sampleGemstoneId) return;
    const cart = await createCart(db);
    createdCartTokens.push(cart.cart_token);

    const updatedCart = await addItemToCart(db, cart.cart_token, {
      product_id: sampleProductId,
      quantity: 1,
    });

    const session = await createCheckoutSession(db, {
      cart_token: cart.cart_token,
      expected_total: updatedCart.pricing_snapshot.grand_total,
      email: 'customer@example.com',
    });
    createdSessionIds.push(session.id);

    expect(session.id).toMatch(/^cs_[a-f0-9]{48}$/);
    expect(session.current_step).toBe('SHIPPING');
    expect(session.pricing_snapshot.grand_total).toBe(updatedCart.pricing_snapshot.grand_total);
    expect(session.email).toBe('customer@example.com');
    expect(new Date(session.reservation_expires_at).getTime()).toBeGreaterThan(Date.now());

    // Verify stock is reserved
    const isReserved = await isGemstoneReserved(db, sampleGemstoneId);
    expect(isReserved).toBe(true);

    // Verify getCheckoutSession returns identical frozen state
    const retrieved = await getCheckoutSession(db, session.id);
    expect(retrieved.id).toBe(session.id);
    expect(retrieved.pricing_snapshot.grand_total).toBe(session.pricing_snapshot.grand_total);
  });

  it('rejects concurrent reservation of the same stone from a different session with ALREADY_RESERVED', async () => {
    if (!hasDb || !db || !sampleProductId) return;
    const cart2 = await createCart(db);
    createdCartTokens.push(cart2.cart_token);

    await addItemToCart(db, cart2.cart_token, {
      product_id: sampleProductId,
      quantity: 1,
    });

    // Attempt to checkout cart2 while stone is already reserved by first session
    await expect(
      createCheckoutSession(db, {
        cart_token: cart2.cart_token,
      }),
    ).rejects.toMatchObject({
      code: 'ALREADY_RESERVED',
    });
  });

  it('releases reservations when session is released', async () => {
    if (!hasDb || !db || createdSessionIds.length === 0 || !sampleGemstoneId) return;
    const activeSessionId = createdSessionIds[0]!;
    const releasedCount = await releaseStockForSession(db, activeSessionId);
    expect(releasedCount).toBeGreaterThan(0);

    const isReserved = await isGemstoneReserved(db, sampleGemstoneId!);
    expect(isReserved).toBe(false);
  });
});
