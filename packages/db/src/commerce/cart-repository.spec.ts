import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { createCatalogDatabase } from '../catalog/executor.js';
import {
  createCart,
  getCartByToken,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  mergeGuestCart,
} from './cart-repository.js';
import { ContractError } from '@maihan/contracts';
import { vi } from 'vitest';
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

describe('Cart Repository & Authoritative Re-pricing (Phase 6 Task 1)', () => {
  let pool: Pool | undefined;
  let db: ReturnType<typeof createCatalogDatabase> | undefined;
  let hasDb = false;
  let sampleProductId: string | undefined;
  let sampleProductPrice: string | undefined;
  let sampleProductKind: string | undefined;
  const createdCartTokens: string[] = [];

  beforeAll(async () => {
    const url = getDatabaseUrl();
    if (!url) return;
    try {
      pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 5000 });
      const client = await pool.connect();
      // Find an active product with a price to use for testing
      const res = await client.query(`
        SELECT p.id, p.price_amount::text AS price_amount, p.kind::text AS kind
        FROM products p
        JOIN gemstones g ON g.id = p.gemstone_id
        WHERE p.price_amount IS NOT NULL
          AND p.state = 'ACTIVE'
          AND p.availability = true
          AND g.availability = true
          AND g.state = 'ACTIVE'
          AND NOT EXISTS (
            SELECT 1 FROM jobs r
            WHERE r.job_key = 'reservation:gemstone:' || g.id::text
              AND r.queue = 'inventory_reservations'
              AND r.state = 'QUEUED'
              AND r.run_after > now()
          )
        ORDER BY p.product_number
        LIMIT 1
      `);
      if (res.rows.length > 0) {
        sampleProductId = res.rows[0].id;
        sampleProductPrice = Number(res.rows[0].price_amount).toFixed(2);
        sampleProductKind = res.rows[0].kind as string;
      }
      client.release();
      db = createCatalogDatabase(pool);
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
      } catch {
        // tolerated: probe failures simply skip the DB-gated tests
      }
    }
    if (pool) {
      await pool.end().catch(() => {});
    }
  });

  it('creates an active cart with unique token and advisory pricing snapshot', async () => {
    if (!hasDb || !db) return;

    const cart = await createCart(db, { anonymous_session_id: 'anon_test_session_123' });
    createdCartTokens.push(cart.cart_token);

    expect(cart.cart_token).toMatch(/^cart_[0-9a-f]{48}$/);
    expect(cart.state).toBe('ACTIVE');
    expect(cart.currency).toBe('USD');
    expect(cart.pricing_snapshot.subtotal).toBe('0.00');
    expect(cart.pricing_snapshot.grand_total).toBe('0.00');
    expect(cart.items).toHaveLength(0);
  });

  it('retrieves cart by token and throws CART_NOT_FOUND for non-existent token', async () => {
    if (!hasDb || !db) return;

    await expect(getCartByToken(db, 'non_existent_cart_token_xyz')).rejects.toThrow(ContractError);
    try {
      await getCartByToken(db, 'non_existent_cart_token_xyz');
    } catch (err) {
      expect((err as ContractError).code).toBe('CART_NOT_FOUND');
      expect((err as ContractError).httpStatus).toBe(404);
    }
  });

  it('rejects price tampering with 409 PRICE_CHANGED when client price disagrees with authoritative price', async () => {
    if (!hasDb || !db || !sampleProductId || !sampleProductPrice) return;

    const cart = await createCart(db);
    createdCartTokens.push(cart.cart_token);

    // Provide a deliberately altered price
    const tamperedPrice = '1.00';
    expect(tamperedPrice).not.toBe(sampleProductPrice);

    await expect(
      addItemToCart(db, cart.cart_token, {
        product_id: sampleProductId,
        quantity: 1,
        expected_unit_price: tamperedPrice,
      }),
    ).rejects.toThrow(ContractError);

    try {
      await addItemToCart(db, cart.cart_token, {
        product_id: sampleProductId,
        quantity: 1,
        expected_unit_price: tamperedPrice,
      });
    } catch (err) {
      const contractErr = err as ContractError;
      expect(contractErr.code).toBe('PRICE_CHANGED');
      expect(contractErr.httpStatus).toBe(409);
      expect(contractErr.details).toBeDefined();
      expect(contractErr.details?.[0]?.['authoritative']).toBe(sampleProductPrice);
    }
  });

  it('adds item to cart with authoritative server re-pricing when expected price matches', async () => {
    if (!hasDb || !db || !sampleProductId || !sampleProductPrice) return;

    const cart = await createCart(db);
    createdCartTokens.push(cart.cart_token);

    const updated = await addItemToCart(db, cart.cart_token, {
      product_id: sampleProductId,
      quantity: 1,
      expected_unit_price: sampleProductPrice,
      engraving_text: 'Test Love 2026',
    });

    expect(updated.items).toHaveLength(1);
    expect(updated.items[0]?.product_id).toBe(sampleProductId);
    expect(updated.items[0]?.quantity).toBe(1);
    expect(updated.items[0]?.unit_price).toBe(sampleProductPrice);
    expect(updated.items[0]?.engraving_text).toBe('Test Love 2026');

    const expectedSubtotal = (Number(sampleProductPrice) * 1).toFixed(2);
    expect(updated.pricing_snapshot.subtotal).toBe(expectedSubtotal);
    expect(updated.pricing_snapshot.grand_total).toBe(expectedSubtotal);
    expect(updated.pricing_snapshot.item_count).toBe(1);
  });

  it('rejects quantity above one for unique loose stones and pairs with 422 (one-of-one guard)', async () => {
    // The guard added in the unique-stone quantity policy applies to
    // LOOSE_STONE and STONE_PAIR products without an explicit inventory
    // quantity; the gemstone-joined fixture is always in that family.
    if (
      !hasDb ||
      !db ||
      !sampleProductId ||
      !sampleProductKind ||
      (sampleProductKind !== 'LOOSE_STONE' && sampleProductKind !== 'STONE_PAIR')
    ) {
      return;
    }

    const cart = await createCart(db);
    createdCartTokens.push(cart.cart_token);

    await expect(
      addItemToCart(db, cart.cart_token, {
        product_id: sampleProductId,
        quantity: 2,
        expected_unit_price: sampleProductPrice,
      }),
    ).rejects.toThrow(ContractError);

    try {
      await addItemToCart(db, cart.cart_token, {
        product_id: sampleProductId,
        quantity: 2,
        expected_unit_price: sampleProductPrice,
      });
    } catch (err) {
      const contractErr = err as ContractError;
      expect(contractErr.code).toBe('UNPROCESSABLE');
      expect(contractErr.httpStatus).toBe(422);
      expect(contractErr.message).toContain('unique stone or pair');
    }
  });

  it('uses the referenced DYO snapshot rather than the configured product price when reading a cart', async () => {
    const statements: string[] = [];
    const queryText = (statement: unknown) => {
      const chunks = (statement as { queryChunks?: Array<{ value?: string[] } | null> }).queryChunks ?? [];
      return chunks.map((chunk) => chunk?.value?.join('') ?? '').join(' ');
    };
    const db: any = {
      execute: vi.fn(async (statement: unknown) => {
        const query = queryText(statement);
        statements.push(query);
        if (query.includes('FROM carts')) {
          return { rows: [{ id: 'cart-id', cart_token: 'cart-token', customer_id: null, anonymous_session_id: null, currency: 'USD', state: 'ACTIVE', pricing_snapshot: null, expires_at: new Date(Date.now() + 60_000), converted_order_id: null, created_at: new Date(), updated_at: new Date() }] };
        }
        if (query.includes('FROM cart_items')) {
          return { rows: [{ id: 'item-id', cart_id: 'cart-id', product_id: 'product-id', configuration_id: 'config-id', price_snapshot_id: 'snapshot-id', dyo_snapshot_amount: '4700.00', quantity: 1, unit_price: '1.00', engraving_text: null, options: {}, added_at: new Date(), product_slug: 'configured', product_title: 'Configured ring', product_state: 'ACTIVE', product_price_amount: '1.00', price_entry_amount: '1.00' }] };
        }
        return { rows: [] };
      }),
    };

    const cart = await getCartByToken(db, 'cart-token');

    expect(cart.items[0]?.unit_price).toBe('4700.00');
    expect(cart.pricing_snapshot.grand_total).toBe('4700.00');
    expect(statements.some((query) => query.includes('dyo_price_snapshots'))).toBe(true);
  });

  it('updates item quantity and recalculates totals', async () => {
    if (!hasDb || !db || !sampleProductId || !sampleProductPrice) return;

    const cart = await createCart(db);
    createdCartTokens.push(cart.cart_token);

    const withItem = await addItemToCart(db, cart.cart_token, {
      product_id: sampleProductId,
      quantity: 1,
    });

    const itemId = withItem.items[0]!.id;
    const updated = await updateCartItemQuantity(db, cart.cart_token, itemId, {
      quantity: 3,
      expected_unit_price: sampleProductPrice,
    });

    expect(updated.items[0]?.quantity).toBe(3);
    const expectedSubtotal = (Number(sampleProductPrice) * 3).toFixed(2);
    expect(updated.pricing_snapshot.subtotal).toBe(expectedSubtotal);
  });

  it('removes item from cart and recalculates totals', async () => {
    if (!hasDb || !db || !sampleProductId) return;

    const cart = await createCart(db);
    createdCartTokens.push(cart.cart_token);

    const withItem = await addItemToCart(db, cart.cart_token, {
      product_id: sampleProductId,
      quantity: 1,
    });

    const itemId = withItem.items[0]!.id;
    const emptied = await removeCartItem(db, cart.cart_token, itemId);

    expect(emptied.items).toHaveLength(0);
    expect(emptied.pricing_snapshot.subtotal).toBe('0.00');
    expect(emptied.pricing_snapshot.item_count).toBe(0);
  });

  it('merges guest cart into customer cart and marks guest cart as CONVERTED', async () => {
    if (!hasDb || !db || !sampleProductId) return;

    const guestCart = await createCart(db, { anonymous_session_id: 'guest_1' });
    createdCartTokens.push(guestCart.cart_token);

    await addItemToCart(db, guestCart.cart_token, {
      product_id: sampleProductId,
      quantity: 1,
    });

    const customerCart = await createCart(db);
    createdCartTokens.push(customerCart.cart_token);

    const merged = await mergeGuestCart(db, customerCart.cart_token, guestCart.cart_token);

    expect(merged.items).toHaveLength(1);
    expect(merged.items[0]?.product_id).toBe(sampleProductId);

    // Verify guest cart state transitioned to CONVERTED
    const guestUpdated = await getCartByToken(db, guestCart.cart_token);
    expect(guestUpdated.state).toBe('CONVERTED');
  });
});
