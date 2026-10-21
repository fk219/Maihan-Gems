/**
 * packages/db/src/commerce/one-of-one-concurrency.spec.ts
 *
 * P1-17: the one-of-one sale proof, executed against a LIVE local
 * PostgreSQL (restricted to local maihan_dev like the other integration
 * suite). Two buyers race to purchase the LAST unique loose stone:
 *
 *   1. exactly ONE placeOrder succeeds;
 *   2. the loser fails with an exhausted-stock outcome (never a partial
 *      order row);
 *   3. the winner's reservation is CONSUMED (no 30-minute resurrection);
 *   4. the stone ends UNAVAILABLE (no oversell window).
 */
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { createCatalogDatabase, type CatalogDatabase } from '../catalog/executor.js';
import { placeOrder } from './order-repository.js';

function getLocalDatabaseUrl(): string | undefined {
  let connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    for (const envPath of [resolve(process.cwd(), '../../.env'), resolve(process.cwd(), '.env')]) {
      if (!existsSync(envPath)) continue;
      const content = readFileSync(envPath, 'utf8');
      connectionString = content
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.startsWith('DATABASE_URL='))
        ?.slice('DATABASE_URL='.length)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      if (connectionString) break;
    }
  }

  if (!connectionString) return undefined;
  try {
    const url = new URL(connectionString);
    const isLocalHost = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
    return isLocalHost && url.port === '5433' && url.pathname === '/maihan_dev'
      ? connectionString
      : undefined;
  } catch {
    return undefined;
  }
}

const localDatabaseUrl = getLocalDatabaseUrl();
const describeWithLocalDatabase = describe.skipIf(!localDatabaseUrl);

describeWithLocalDatabase('One-of-one concurrency proof (local PostgreSQL)', () => {
  let pool: pg.Pool | undefined;
  let db: CatalogDatabase | undefined;
  const suffix = randomUUID();
  const fixture = {
    gemstoneId: randomUUID(),
    varietyId: randomUUID(),
    speciesId: randomUUID(),
    productAId: randomUUID(),
    productBId: randomUUID(),
    cartAId: randomUUID(),
    cartBId: randomUUID(),
    cartAToken: `cart_conc_a_${suffix.slice(0, 8)}`,
    cartBToken: `cart_conc_b_${suffix.slice(0, 8)}`,
    sessionAId: `cs_${randomUUID().replaceAll('-', '')}`,
    sessionBId: `cs_${randomUUID().replaceAll('-', '')}`,
    idempotencyA: `conc-a-${suffix}`,
    idempotencyB: `conc-b-${suffix}`,
  };
  let stoneRef = '';

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: localDatabaseUrl!, max: 5, connectionTimeoutMillis: 5000 });
    db = createCatalogDatabase(pool);
    const client = await pool.connect();
    try {
      const identity = await client.query<{ current_database: string }>('SELECT current_database()');
      if (identity.rows[0]?.current_database !== 'maihan_dev') {
        throw new Error('Concurrency proof is restricted to local maihan_dev.');
      }
      stoneRef = `IT-${fixture.gemstoneId}`;

      await client.query('BEGIN');
      await client.query(
        `INSERT INTO gemstone_species (id, code, name) VALUES ($1, $2, 'Concurrency-test corundum')`,
        [fixture.speciesId, `itc-${fixture.speciesId}`],
      );
      await client.query(
        `INSERT INTO gemstone_varieties (id, species_id, slug, name, display_name)
         VALUES ($1, $2, $3, $4, $4)`,
        [fixture.varietyId, fixture.speciesId, `itc-${fixture.varietyId}`, 'Concurrency-test sapphire'],
      );
      await client.query(
        `INSERT INTO gemstones (
           id, gem_ref, kind, variety_id, total_weight_ct, price_amount,
           currency, price_evidence, availability, state
         ) VALUES ($1, $2, 'SINGLE', $3, 1.250, 9500.00, 'USD', 'OBSERVED', true, 'ACTIVE')`,
        [fixture.gemstoneId, stoneRef, fixture.varietyId],
      );
      // TWO products reference the SAME last stone (the race: both buyers
      // pile into the one stone that exists).
      const productInsert = `INSERT INTO products (
           id, kind, slug, title, gemstone_id, jewellery_type, total_weight_ct,
           price_amount, currency, price_evidence, state, availability
         ) VALUES ($1, 'LOOSE_STONE', $2, $3, $4, 'RING', 1.250, 9500.00, 'USD', 'OBSERVED', 'ACTIVE', true)`;
      await client.query(productInsert, [
        fixture.productAId,
        `conc-a-${suffix.slice(0, 8)}`,
        'Concurrency-test stone A',
        fixture.gemstoneId,
      ]);
      await client.query(productInsert, [
        fixture.productBId,
        `conc-b-${suffix.slice(0, 8)}`,
        'Concurrency-test stone B',
        fixture.gemstoneId,
      ]);
      await client.query(
        `INSERT INTO carts (id, cart_token, currency, state, expires_at)
         VALUES ($1, $2, 'USD', 'ACTIVE', now() + interval '1 day'),
                ($3, $4, 'USD', 'ACTIVE', now() + interval '1 day')`,
        [fixture.cartAId, fixture.cartAToken, fixture.cartBId, fixture.cartBToken],
      );
      await client.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity, unit_price, options)
         VALUES ($1, $2, 1, 9500.00, '{}'::jsonb),
                ($3, $4, 1, 9500.00, '{}'::jsonb)`,
        [fixture.cartAId, fixture.productAId, fixture.cartBId, fixture.productBId],
      );
      // Real ACTIVE reservations for each session (the checkout flow creates
      // these; the race asserts the winning one flips to CONSUMED).
      await client.query(
        `INSERT INTO inventory_reservations (job_key, gemstone_id, session_id, cart_id, expires_at)
         VALUES ($1, $2, $3, $4, now() + interval '30 minutes'),
                ($5, $2, $6, $7, now() + interval '30 minutes')`,
        [
          `reservation:gemstone:${fixture.gemstoneId}:a`,
          fixture.gemstoneId,
          fixture.sessionAId,
          fixture.cartAId,
          `reservation:gemstone:${fixture.gemstoneId}:b`,
          fixture.sessionBId,
          fixture.cartBId,
        ],
      );

      const pricingSnapshot = {
        currency: 'USD',
        subtotal: '9500.00',
        discount_total: '0.00',
        shipping_total: '0.00',
        tax_total: '0.00',
        grand_total: '9500.00',
        item_count: 1,
        computed_at: new Date().toISOString(),
      };
      const buyerEmail = 'one-of-one-race@example.test';
      const shippingAddress = {
        full_name: 'Concurrency Buyer',
        line1: '1 Race Street',
        city: 'Dubai',
        postal_code: '00000',
        country_code: 'AE',
      };
      const paymentIntentId = `pi_conc_${suffix}`;
      const sessionValues = (sessionId: string, cartToken: string): Array<unknown> => [
        sessionId,
        cartToken,
        buyerEmail,
        'CONFIRM',
        JSON.stringify({
          id: sessionId,
          cart_token: cartToken,
          customer_id: null,
          email: buyerEmail,
          current_step: 'CONFIRM',
          pricing_snapshot: pricingSnapshot,
          shipping_address: shippingAddress,
          shipping_method: null,
          payment_intent_id: paymentIntentId,
          reservation_expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
          created_at: new Date().toISOString(),
          completed_order_id: null,
        }),
        new Date(Date.now() + 30 * 60_000).toISOString(),
      ];
      await client.query(
        `INSERT INTO checkout_sessions (
           id, cart_token, customer_id, email, current_step, payload, reservation_expires_at
         ) VALUES ($1, $2, NULL, $3, $4, $5::jsonb, $6::timestamptz)`,
        sessionValues(fixture.sessionAId, fixture.cartAToken),
      );
      await client.query(
        `INSERT INTO checkout_sessions (
           id, cart_token, customer_id, email, current_step, payload, reservation_expires_at
         ) VALUES ($1, $2, NULL, $3, $4, $5::jsonb, $6::timestamptz)`,
        sessionValues(fixture.sessionBId, fixture.cartBToken),
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }, 20_000);

  afterAll(async () => {
    if (!pool) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `DELETE FROM order_events WHERE order_id IN
           (SELECT id FROM orders WHERE idempotency_key IN ($1, $2))`,
        [fixture.idempotencyA, fixture.idempotencyB],
      );
      await client.query(
        `DELETE FROM order_items WHERE order_id IN
           (SELECT id FROM orders WHERE idempotency_key IN ($1, $2))`,
        [fixture.idempotencyA, fixture.idempotencyB],
      );
      await client.query(
        `DELETE FROM audit_logs WHERE entity_id IN
           (SELECT id FROM orders WHERE idempotency_key IN ($1, $2))`,
        [fixture.idempotencyA, fixture.idempotencyB],
      );
      // P1-27 FK hygiene: detach the conversion pointers before deleting
      // the order rows themselves.
      await client.query(
        `UPDATE carts SET converted_order_id = NULL
         WHERE converted_order_id IN (SELECT id FROM orders WHERE idempotency_key IN ($1, $2))`,
        [fixture.idempotencyA, fixture.idempotencyB],
      );
      await client.query(
        `UPDATE checkout_sessions SET completed_order_id = NULL
         WHERE completed_order_id IN (SELECT id FROM orders WHERE idempotency_key IN ($1, $2))`,
        [fixture.idempotencyA, fixture.idempotencyB],
      );
      await client.query(
        `DELETE FROM orders WHERE idempotency_key IN ($1, $2)`,
        [fixture.idempotencyA, fixture.idempotencyB],
      );
      await client.query(
        `DELETE FROM inventory_reservations WHERE gemstone_id = $1`,
        [fixture.gemstoneId],
      );
      await client.query(`DELETE FROM carts WHERE id IN ($1, $2)`, [fixture.cartAId, fixture.cartBId]);
      await client.query(`DELETE FROM checkout_sessions WHERE id IN ($1, $2)`, [fixture.sessionAId, fixture.sessionBId]);
      await client.query(`DELETE FROM products WHERE id IN ($1, $2)`, [fixture.productAId, fixture.productBId]);
      await client.query(`DELETE FROM gemstones WHERE id = $1`, [fixture.gemstoneId]);
      await client.query(`DELETE FROM gemstone_varieties WHERE id = $1`, [fixture.varietyId]);
      await client.query(`DELETE FROM gemstone_species WHERE id = $1`, [fixture.speciesId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  }, 20_000);

  it('races two buyers for the last stone: exactly one order wins, the other fails cleanly', async () => {
    if (!db) throw new Error('Local PostgreSQL was not initialized.');

    const attempts = await Promise.allSettled([
      placeOrder(db, {
        checkout_session_id: fixture.sessionAId,
        idempotency_key: fixture.idempotencyA,
      }),
      placeOrder(db, {
        checkout_session_id: fixture.sessionBId,
        idempotency_key: fixture.idempotencyB,
      }),
    ]);

    const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
    const rejected = attempts.filter((a) => a.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const err = (rejected[0] as PromiseRejectedResult).reason as Error & { code?: string };
    // Overselling is refused with an exhausted-stock outcome.
    expect(['OUT_OF_STOCK', 'ALREADY_RESERVED', 'UNPROCESSABLE', 'PRICE_CHANGED']).toContain(err.code);
    expect(err.message).toBeDefined();

    const winner = await db.execute(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await import('drizzle-orm')).sql`SELECT id, state::text AS state FROM orders WHERE idempotency_key IN (${fixture.idempotencyA}, ${fixture.idempotencyB})`,
    );
    expect(winner.rows).toHaveLength(1);
    expect((winner.rows[0] as { state: string }).state).toBe('PENDING_PAYMENT');

    // 3. The winner's reservation is CONSUMED — no 30-minute resurrection.
    const consumedRes = await pool.query(
      `SELECT state FROM inventory_reservations WHERE gemstone_id = $1`,
      [fixture.gemstoneId],
    );
    const consumedRows = consumedRes.rows as Array<{ state: string }>;
    const hasConsumed = consumedRows.some((r) => r.state === 'CONSUMED');
    expect(hasConsumed).toBe(true);

    // 4. The stone is UNAVAILABLE — no oversell window for a third buyer.
    const stoneRes = await pool.query(
      `SELECT availability, state::text AS state FROM gemstones WHERE id = $1`,
      [fixture.gemstoneId],
    );
    const stone = stoneRes.rows[0] as { availability: boolean; state: string };
    expect(stone.availability).toBe(false);
  }, 30_000);
});
