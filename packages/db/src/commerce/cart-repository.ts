/**
 * packages/db/src/commerce/cart-repository.ts
 *
 * Phase 6 Task 1 — Cart repository and authoritative server-side repricing.
 *
 * Authority:
 * - technical_design/13 COMMERCE ARCHITECTURE §60-75 (Cart lifecycle, guest cart merging, re-pricing).
 * - technical_design/04 DATABASE IMPLEMENTATION.
 * - Invariant: Client is NEVER authoritative for price. Price changes reject with 409 PRICE_CHANGED.
 */
import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import {
  ContractError,
  type AddToCartInput,
  type CartDto,
  type CartItemDto,
  type CreateCartInput,
  type PricingSnapshotDto,
  type UpdateCartItemInput,
} from '@maihan/contracts';
import {
  assertValidEngraving,
  assertValidQuantity,
  comparePriceMatch,
  computeCartPricingSnapshot,
  computeLineTotal,
} from '@maihan/domain';

interface RawCartRow {
  id: string;
  cart_token: string;
  customer_id: string | null;
  anonymous_session_id: string | null;
  currency: string;
  state: 'ACTIVE' | 'CONVERTED' | 'ABANDONED' | 'EXPIRED';
  pricing_snapshot: PricingSnapshotDto | null;
  expires_at: Date;
  converted_order_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface RawCartItemRow {
  id: string;
  cart_id: string;
  product_id: string;
  configuration_id: string | null;
  quantity: number;
  unit_price: string;
  engraving_text: string | null;
  options: Record<string, unknown> | null;
  added_at: Date;
  product_slug: string;
  product_title: string;
  product_state: string;
  product_price_amount: string | null;
  price_entry_amount: string | null;
}

function generateCartToken(): string {
  return `cart_${randomBytes(24).toString('hex')}`;
}

function toIso(dateOrString: Date | string | null | undefined): string {
  if (!dateOrString) return new Date().toISOString();
  return new Date(dateOrString).toISOString();
}

function resolveAuthoritativeUnitPrice(row: {
  product_price_amount: string | null;
  price_entry_amount: string | null;
  unit_price: string;
}): string {
  if (row.product_price_amount !== null && row.product_price_amount !== '') {
    return Number(row.product_price_amount).toFixed(2);
  }
  if (row.price_entry_amount !== null && row.price_entry_amount !== '') {
    return Number(row.price_entry_amount).toFixed(2);
  }
  return Number(row.unit_price).toFixed(2);
}

export async function createCart(
  db: CatalogDatabase,
  input: CreateCartInput = {},
): Promise<CartDto> {
  const cartToken = generateCartToken();
  const ttlDays = 30;
  const initialSnapshot: PricingSnapshotDto = {
    currency: 'USD',
    subtotal: '0.00',
    discount_total: '0.00',
    shipping_total: '0.00',
    tax_total: '0.00',
    grand_total: '0.00',
    item_count: 0,
    computed_at: new Date().toISOString(),
  };

  const insertStatement = sql`
    INSERT INTO carts (
      cart_token,
      customer_id,
      anonymous_session_id,
      currency,
      state,
      pricing_snapshot,
      expires_at
    ) VALUES (
      ${cartToken},
      ${input.customer_id ?? null},
      ${input.anonymous_session_id ?? null},
      'USD',
      'ACTIVE',
      ${JSON.stringify(initialSnapshot)}::jsonb,
      now() + (${ttlDays} * INTERVAL '1 day')
    )
    RETURNING
      id,
      cart_token,
      customer_id,
      anonymous_session_id,
      currency,
      state,
      pricing_snapshot,
      expires_at,
      converted_order_id,
      created_at,
      updated_at
  `;

  const result = await db.execute(insertStatement);
  const row = result.rows[0] as unknown as RawCartRow;

  return {
    id: row.id,
    cart_token: row.cart_token,
    customer_id: row.customer_id,
    anonymous_session_id: row.anonymous_session_id,
    currency: 'USD',
    state: row.state,
    pricing_snapshot: (row.pricing_snapshot as PricingSnapshotDto) ?? initialSnapshot,
    items: [],
    expires_at: toIso(row.expires_at),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

export async function getCartByToken(
  db: CatalogDatabase,
  cartToken: string,
): Promise<CartDto> {
  const cartQuery = sql`
    SELECT
      id,
      cart_token,
      customer_id,
      anonymous_session_id,
      currency,
      state,
      pricing_snapshot,
      expires_at,
      converted_order_id,
      created_at,
      updated_at
    FROM carts
    WHERE cart_token = ${cartToken}
    LIMIT 1
  `;

  const cartResult = await db.execute(cartQuery);
  if (cartResult.rows.length === 0) {
    throw new ContractError('CART_NOT_FOUND', `Cart with token "${cartToken}" not found.`);
  }

  const cart = cartResult.rows[0] as unknown as RawCartRow;
  const now = new Date();
  const cartExpiry = new Date(cart.expires_at);

  if (cartExpiry.getTime() <= now.getTime()) {
    if (cart.state === 'ACTIVE') {
      await db.execute(sql`UPDATE carts SET state = 'EXPIRED', updated_at = now() WHERE id = ${cart.id}`);
    }
    throw new ContractError('CART_EXPIRED', `Cart expired at ${toIso(cart.expires_at)}.`);
  }

  // Load cart items with joined product and price information
  const itemsQuery = sql`
    SELECT
      ci.id,
      ci.cart_id,
      ci.product_id,
      ci.configuration_id,
      ci.quantity,
      ci.unit_price::text AS unit_price,
      ci.engraving_text,
      ci.options,
      ci.added_at,
      p.slug AS product_slug,
      p.title AS product_title,
      p.state::text AS product_state,
      p.price_amount::text AS product_price_amount,
      pe.amount::text AS price_entry_amount
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN LATERAL (
      SELECT amount
      FROM price_entries pe
      WHERE pe.subject_type = 'PRODUCT'
        AND pe.subject_id = p.id
        AND (pe.valid_to IS NULL OR pe.valid_to > now())
      ORDER BY pe.created_at DESC
      LIMIT 1
    ) pe ON true
    WHERE ci.cart_id = ${cart.id}
    ORDER BY ci.added_at ASC
  `;

  const itemsResult = await db.execute(itemsQuery);
  const rawItems = itemsResult.rows as unknown as RawCartItemRow[];

  // Server-side authoritative re-pricing of items
  const items: CartItemDto[] = [];
  const pricingInputItems: Array<{ unitPrice: string; quantity: number }> = [];

  for (const itemRow of rawItems) {
    const authoritativePrice = resolveAuthoritativeUnitPrice(itemRow);
    const lineTotal = computeLineTotal(authoritativePrice, itemRow.quantity);

    // If item row unit price differs from authoritative, sync it back to DB
    if (itemRow.unit_price !== authoritativePrice) {
      await db.execute(
        sql`UPDATE cart_items SET unit_price = ${authoritativePrice}::numeric WHERE id = ${itemRow.id}`,
      );
    }

    items.push({
      id: itemRow.id,
      product_id: itemRow.product_id,
      product_slug: itemRow.product_slug,
      title: itemRow.product_title,
      configuration_id: itemRow.configuration_id,
      quantity: itemRow.quantity,
      unit_price: authoritativePrice,
      line_total: lineTotal,
      engraving_text: itemRow.engraving_text,
      options: itemRow.options ?? {},
      added_at: toIso(itemRow.added_at),
    });

    pricingInputItems.push({
      unitPrice: authoritativePrice,
      quantity: itemRow.quantity,
    });
  }

  const computedSnapshot = computeCartPricingSnapshot(pricingInputItems);

  // Update carts advisory pricing_snapshot
  await db.execute(
    sql`UPDATE carts SET pricing_snapshot = ${JSON.stringify(computedSnapshot)}::jsonb, updated_at = now() WHERE id = ${cart.id}`,
  );

  return {
    id: cart.id,
    cart_token: cart.cart_token,
    customer_id: cart.customer_id,
    anonymous_session_id: cart.anonymous_session_id,
    currency: 'USD',
    state: cart.state,
    pricing_snapshot: computedSnapshot,
    items,
    expires_at: toIso(cart.expires_at),
    created_at: toIso(cart.created_at),
    updated_at: toIso(cart.updated_at),
  };
}

export async function addItemToCart(
  db: CatalogDatabase,
  cartToken: string,
  input: AddToCartInput,
): Promise<CartDto> {
  const quantity = input.quantity ?? 1;
  assertValidQuantity(quantity);
  assertValidEngraving(input.engraving_text);

  // Verify cart exists and is active
  const cartQuery = sql`
    SELECT id, state, expires_at FROM carts WHERE cart_token = ${cartToken} LIMIT 1
  `;
  const cartRes = await db.execute(cartQuery);
  if (cartRes.rows.length === 0) {
    throw new ContractError('CART_NOT_FOUND', `Cart with token "${cartToken}" not found.`);
  }
  const cartRow = cartRes.rows[0] as unknown as { id: string; state: string; expires_at: Date };
  if (cartRow.state !== 'ACTIVE' || new Date(cartRow.expires_at).getTime() <= Date.now()) {
    throw new ContractError('CART_EXPIRED', 'Cart is expired or not active.');
  }

  // Verify product is active and get authoritative price
  const productQuery = sql`
    SELECT
      p.id,
      p.slug,
      p.title,
      p.state,
      p.price_amount::text AS product_price_amount,
      pe.amount::text AS price_entry_amount
    FROM products p
    LEFT JOIN LATERAL (
      SELECT amount
      FROM price_entries pe
      WHERE pe.subject_type = 'PRODUCT'
        AND pe.subject_id = p.id
        AND (pe.valid_to IS NULL OR pe.valid_to > now())
      ORDER BY pe.created_at DESC
      LIMIT 1
    ) pe ON true
    WHERE p.id = ${input.product_id}
      AND p.deleted_at IS NULL
    LIMIT 1
  `;
  const productRes = await db.execute(productQuery);
  if (productRes.rows.length === 0) {
    throw new ContractError('PRODUCT_NOT_FOUND', `Product with id "${input.product_id}" not found.`);
  }
  const product = productRes.rows[0] as unknown as {
    id: string;
    slug: string;
    title: string;
    state: string;
    product_price_amount: string | null;
    price_entry_amount: string | null;
  };

  const authoritativePrice = resolveAuthoritativeUnitPrice({
    product_price_amount: product.product_price_amount,
    price_entry_amount: product.price_entry_amount,
    unit_price: '0.00',
  });

  // Strict price tampering protection: reject if client expected price does not match
  if (!comparePriceMatch(input.expected_unit_price, authoritativePrice)) {
    throw new ContractError(
      'PRICE_CHANGED',
      `Product price has changed. Expected ${input.expected_unit_price}, current authoritative price is ${authoritativePrice}.`,
      [
        {
          field: 'unit_price',
          expected: input.expected_unit_price,
          authoritative: authoritativePrice,
        },
      ],
    );
  }

  // Insert or update cart item
  const optionsJson = JSON.stringify(input.options ?? {});
  const upsertItem = sql`
    INSERT INTO cart_items (
      cart_id,
      product_id,
      configuration_id,
      quantity,
      unit_price,
      engraving_text,
      options
    ) VALUES (
      ${cartRow.id},
      ${product.id},
      ${input.configuration_id ?? null},
      ${quantity},
      ${authoritativePrice}::numeric,
      ${input.engraving_text ?? null},
      ${optionsJson}::jsonb
    )
    ON CONFLICT (cart_id, product_id, configuration_id)
    DO UPDATE SET
      quantity = cart_items.quantity + EXCLUDED.quantity,
      unit_price = EXCLUDED.unit_price,
      engraving_text = COALESCE(EXCLUDED.engraving_text, cart_items.engraving_text),
      options = EXCLUDED.options
  `;

  await db.execute(upsertItem);
  return getCartByToken(db, cartToken);
}

export async function updateCartItemQuantity(
  db: CatalogDatabase,
  cartToken: string,
  itemId: string,
  input: UpdateCartItemInput,
): Promise<CartDto> {
  assertValidQuantity(input.quantity);

  const cart = await getCartByToken(db, cartToken);
  const targetItem = cart.items.find((item: CartItemDto) => item.id === itemId);
  if (targetItem === undefined) {
    throw new ContractError('VALIDATION_FAILED', `Cart item with id "${itemId}" does not exist in cart.`);
  }

  // Check if expected price matches current authoritative item price
  if (!comparePriceMatch(input.expected_unit_price, targetItem.unit_price)) {
    throw new ContractError(
      'PRICE_CHANGED',
      `Product price has changed. Expected ${input.expected_unit_price}, current authoritative price is ${targetItem.unit_price}.`,
      [
        {
          field: 'unit_price',
          expected: input.expected_unit_price,
          authoritative: targetItem.unit_price,
        },
      ],
    );
  }

  await db.execute(
    sql`UPDATE cart_items SET quantity = ${input.quantity} WHERE id = ${itemId} AND cart_id = ${cart.id}`,
  );

  return getCartByToken(db, cartToken);
}

export async function removeCartItem(
  db: CatalogDatabase,
  cartToken: string,
  itemId: string,
): Promise<CartDto> {
  const cart = await getCartByToken(db, cartToken);
  await db.execute(
    sql`DELETE FROM cart_items WHERE id = ${itemId} AND cart_id = ${cart.id}`,
  );
  return getCartByToken(db, cartToken);
}

export async function mergeGuestCart(
  db: CatalogDatabase,
  customerCartToken: string,
  guestCartToken: string,
): Promise<CartDto> {
  if (customerCartToken === guestCartToken) {
    return getCartByToken(db, customerCartToken);
  }

  const guestCart = await getCartByToken(db, guestCartToken);

  // Transfer all items from guest cart to customer cart
  for (const item of guestCart.items) {
    await addItemToCart(db, customerCartToken, {
      product_id: item.product_id,
      configuration_id: item.configuration_id ?? undefined,
      quantity: item.quantity,
      engraving_text: item.engraving_text ?? undefined,
      options: item.options,
    });
  }

  // Mark guest cart as CONVERTED
  await db.execute(
    sql`UPDATE carts SET state = 'CONVERTED', updated_at = now() WHERE id = ${guestCart.id}`,
  );

  return getCartByToken(db, customerCartToken);
}
