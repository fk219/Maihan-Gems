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

describeWithLocalDatabase('Order repository DYO snapshot integration (local PostgreSQL)', () => {
  let pool: pg.Pool | undefined;
  let db: CatalogDatabase | undefined;
  const fixture = {
    gemstoneId: randomUUID(),
    varietyId: randomUUID(),
    speciesId: randomUUID(),
    settingId: randomUUID(),
    settingVariantId: randomUUID(),
    configurationId: randomUUID(),
    selectedSnapshotId: randomUUID(),
    newerSnapshotId: randomUUID(),
    productId: randomUUID(),
    cartId: randomUUID(),
    orderIdempotencyKey: `order-it-${randomUUID()}`,
    cartToken: `cart_it_${randomUUID()}`,
    shortCode: `dyoit-${randomUUID().slice(0, 12)}`,
    checkoutSessionId: `cs_${randomUUID().replaceAll('-', '')}`,
  };

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: localDatabaseUrl!, max: 3, connectionTimeoutMillis: 5000 });
    db = createCatalogDatabase(pool);
    const client = await pool.connect();
    try {
      const identity = await client.query<{ current_database: string }>('SELECT current_database()');
      if (identity.rows[0]?.current_database !== 'maihan_dev') {
        throw new Error('DYO snapshot integration is restricted to local maihan_dev.');
      }

      await client.query('BEGIN');
      await client.query(
        `INSERT INTO gemstone_species (id, code, name)
         VALUES ($1, $2, 'Integration-test corundum')`,
        [fixture.speciesId, `it-${fixture.speciesId}`],
      );
      await client.query(
        `INSERT INTO gemstone_varieties (id, species_id, slug, name, display_name)
         VALUES ($1, $2, $3, $4, $4)`,
        [fixture.varietyId, fixture.speciesId, `it-${fixture.varietyId}`, 'Integration-test sapphire'],
      );
      await client.query(
        `INSERT INTO gemstones (
           id, gem_ref, kind, variety_id, total_weight_ct, price_amount,
           currency, price_evidence, availability, state
         ) VALUES ($1, $2, 'SINGLE', $3, 2.500, 3500.00, 'USD', 'OBSERVED', true, 'ACTIVE')`,
        [fixture.gemstoneId, `IT-${fixture.gemstoneId}`, fixture.varietyId],
      );
      await client.query(
        `INSERT INTO settings (id, design_code, name, jewellery_type)
         VALUES ($1, $2, 'Integration-test solitaire', 'RING')`,
        [fixture.settingId, `IT-${fixture.settingId}`],
      );
      await client.query(
        `INSERT INTO setting_variants (
           id, setting_id, metal_code, sku, slug, base_price, currency,
           price_evidence, availability, state
         ) VALUES ($1, $2, 'W14', $3, $4, 1200.00, 'USD', 'OBSERVED', true, 'ACTIVE')`,
        [fixture.settingVariantId, fixture.settingId, `IT-${fixture.settingVariantId}`, `it-${fixture.settingVariantId}`],
      );
      await client.query(
        `INSERT INTO dyo_configurations (
           id, configuration_hash, short_code, jewellery_type, setting_id,
           setting_variant_id, gemstone_id, state, compatibility_status,
           selected_options
         ) VALUES ($1, $2, $3, 'RING', $4, $5, $6, 'PRICED', 'COMPATIBLE', $7::jsonb)`,
        [
          fixture.configurationId,
          `sha256:${fixture.configurationId}`,
          fixture.shortCode,
          fixture.settingId,
          fixture.settingVariantId,
          fixture.gemstoneId,
          JSON.stringify({ metal: 'W14' }),
        ],
      );
      await client.query(
        `INSERT INTO dyo_price_snapshots (
           id, configuration_id, gemstone_component, setting_component, total,
           currency, pricing_rule_version, breakdown, computed_at, expires_at
         ) VALUES
           ($1, $3, 3500.00, 1200.00, 4700.00, 'USD', 'integration-v1', $4::jsonb, now(), now() + interval '1 day'),
           ($2, $3, 8000.00, 1200.00, 9200.00, 'USD', 'integration-v1', $5::jsonb, now() + interval '1 minute', now() + interval '1 day')`,
        [
          fixture.selectedSnapshotId,
          fixture.newerSnapshotId,
          fixture.configurationId,
          JSON.stringify({ gemstone: '3500.00', setting: '1200.00' }),
          JSON.stringify({ gemstone: '8000.00', setting: '1200.00' }),
        ],
      );
      await client.query(
        `INSERT INTO dyo_quotes (
           quote_token, configuration_id, price_snapshot_id, expires_at, consumed_at
         ) VALUES
           ($1, $3, $4, now() + interval '1 day', now()),
           ($2, $3, $5, now() + interval '1 day', NULL)`,
        [
          `quote_it_${fixture.selectedSnapshotId}`,
          `quote_it_${fixture.newerSnapshotId}`,
          fixture.configurationId,
          fixture.selectedSnapshotId,
          fixture.newerSnapshotId,
        ],
      );
      await client.query(
        `INSERT INTO products (
           id, kind, slug, title, setting_variant_id, gemstone_id,
           jewellery_type, price_amount, currency, price_evidence,
           state, availability
         ) VALUES ($1, 'CONFIGURED', $2, 'Integration-test configured ring', $3, $4,
                   'RING', 1.00, 'USD', 'INFERRED', 'ACTIVE', true)`,
        [fixture.productId, `dyo-${fixture.shortCode}`, fixture.settingVariantId, fixture.gemstoneId],
      );
      await client.query(
        `INSERT INTO carts (id, cart_token, currency, state, expires_at)
         VALUES ($1, $2, 'USD', 'ACTIVE', now() + interval '1 day')`,
        [fixture.cartId, fixture.cartToken],
      );
      await client.query(
        `INSERT INTO cart_items (
           cart_id, product_id, configuration_id, price_snapshot_id,
           quantity, unit_price, options
         ) VALUES ($1, $2, $3, $4, 1, 4700.00, '{}'::jsonb)`,
        [fixture.cartId, fixture.productId, fixture.configurationId, fixture.selectedSnapshotId],
      );
      const pricingSnapshot = {
        currency: 'USD',
        subtotal: '4700.00',
        discount_total: '0.00',
        shipping_total: '0.00',
        tax_total: '0.00',
        grand_total: '4700.00',
        item_count: 1,
        computed_at: new Date().toISOString(),
      };
      const session = {
        id: fixture.checkoutSessionId,
        cart_token: fixture.cartToken,
        customer_id: null,
        email: 'dyo-order-integration@example.test',
        current_step: 'CONFIRM',
        pricing_snapshot: pricingSnapshot,
        shipping_address: {
          full_name: 'Integration Buyer',
          line1: '1 Test Street',
          city: 'New York',
          postal_code: '10001',
          country_code: 'US',
        },
        shipping_method: null,
        payment_intent_id: `pi_${randomUUID().replaceAll('-', '')}`,
        reservation_expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
        created_at: new Date().toISOString(),
        completed_order_id: null,
      };
      await client.query(
        `INSERT INTO checkout_sessions (
           id, cart_token, customer_id, email, current_step, payload, reservation_expires_at
         ) VALUES ($1, $2, NULL, $3, $4, $5::jsonb, $6::timestamptz)`,
        [
          fixture.checkoutSessionId,
          fixture.cartToken,
          session.email,
          session.current_step,
          JSON.stringify(session),
          session.reservation_expires_at,
        ],
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
        `DELETE FROM audit_logs WHERE entity_id IN
           (SELECT id FROM orders WHERE idempotency_key = $1)`,
        [fixture.orderIdempotencyKey],
      );
      await client.query(
        `DELETE FROM order_events WHERE order_id IN
           (SELECT id FROM orders WHERE idempotency_key = $1)`,
        [fixture.orderIdempotencyKey],
      );
      await client.query(
        `DELETE FROM order_items WHERE order_id IN
           (SELECT id FROM orders WHERE idempotency_key = $1)`,
        [fixture.orderIdempotencyKey],
      );
      // P1-27 FK hygiene: detach the conversion pointers before removing
      // the order row.
      await client.query(
        `UPDATE carts SET converted_order_id = NULL
         WHERE converted_order_id IN (SELECT id FROM orders WHERE idempotency_key = $1)`,
        [fixture.orderIdempotencyKey],
      );
      await client.query(
        `UPDATE checkout_sessions SET completed_order_id = NULL
         WHERE completed_order_id IN (SELECT id FROM orders WHERE idempotency_key = $1)`,
        [fixture.orderIdempotencyKey],
      );
      await client.query('DELETE FROM orders WHERE idempotency_key = $1', [fixture.orderIdempotencyKey]);
      await client.query('DELETE FROM carts WHERE id = $1', [fixture.cartId]);
      await client.query('DELETE FROM checkout_sessions WHERE id = $1', [fixture.checkoutSessionId]);
      await client.query('DELETE FROM products WHERE id = $1', [fixture.productId]);
      await client.query('DELETE FROM dyo_quotes WHERE configuration_id = $1', [fixture.configurationId]);
      await client.query('DELETE FROM dyo_configurations WHERE id = $1', [fixture.configurationId]);
      await client.query('DELETE FROM gemstones WHERE id = $1', [fixture.gemstoneId]);
      await client.query('DELETE FROM setting_variants WHERE id = $1', [fixture.settingVariantId]);
      await client.query('DELETE FROM settings WHERE id = $1', [fixture.settingId]);
      await client.query('DELETE FROM gemstone_varieties WHERE id = $1', [fixture.varietyId]);
      await client.query('DELETE FROM gemstone_species WHERE id = $1', [fixture.speciesId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  }, 20_000);

  it('orders the cart-selected DYO quote, not a newer quote for the same configuration', async () => {
    if (!db) throw new Error('Local PostgreSQL was not initialized.');
    const order = await placeOrder(db, {
      checkout_session_id: fixture.checkoutSessionId,
      idempotency_key: fixture.orderIdempotencyKey,
    });

    expect(order.pricing_snapshot.grand_total).toBe('4700.00');
    expect(order.items).toHaveLength(1);
    expect(order.items[0]?.unit_price).toBe('4700.00');
    expect(order.items[0]?.configuration_snapshot).toMatchObject({
      configuration_id: fixture.configurationId,
      price_snapshot_id: fixture.selectedSnapshotId,
      total: '4700.00',
      breakdown: { gemstone: '3500.00', setting: '1200.00' },
    });
    expect(order.items[0]?.configuration_snapshot).not.toMatchObject({
      price_snapshot_id: fixture.newerSnapshotId,
      total: '9200.00',
    });
  }, 20_000);
});
