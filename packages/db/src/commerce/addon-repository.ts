/**
 * packages/db/src/commerce/addon-repository.ts
 *
 * Phase 6 Task 9 — Financing & Protection Plan product add-on repository.
 *
 * Authority:
 * - technical_design/13 COMMERCE ARCHITECTURE §Add-ons.
 * - Invariant: Attached as separate order lines; placed orders are immutable.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import {
  ContractError,
  type CreateProductAddonInput,
  type OrderDto,
  type ProductAddonDto,
} from '@maihan/contracts';
import { getCustomerOrders } from './account-repository.js';

interface AddonRow {
  id: string;
  product_id: string | null;
  addon_type: 'FINANCING' | 'PROTECTION_PLAN' | 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  code: string;
  name: string;
  price: string;
  currency: string;
  state: string;
  created_at: string;
}

export async function listProductAddons(
  db: CatalogDatabase,
  filter?: { productId?: string; addonType?: string },
): Promise<ProductAddonDto[]> {
  const conditions = [sql`state = 'ACTIVE'`];

  if (filter?.productId) {
    conditions.push(sql`(product_id IS NULL OR product_id = ${filter.productId})`);
  }
  if (filter?.addonType) {
    conditions.push(sql`addon_type = ${filter.addonType}`);
  }

  const whereClause = sql.join(conditions, sql` AND `);

  const res = await db.execute(sql`
    SELECT
      id,
      product_id,
      addon_type::text AS addon_type,
      code,
      name,
      price::text AS price,
      currency,
      state::text AS state,
      created_at
    FROM product_addons
    WHERE ${whereClause}
    ORDER BY created_at ASC
  `);

  return (res.rows as unknown as AddonRow[]).map((row) => ({
    id: row.id,
    product_id: row.product_id,
    addon_type: row.addon_type,
    code: row.code,
    name: row.name,
    price: Number(row.price).toFixed(2),
    currency: row.currency,
    state: row.state,
    created_at: new Date(row.created_at).toISOString(),
  }));
}

export async function getProductAddon(
  db: CatalogDatabase,
  addonIdOrCode: string,
): Promise<ProductAddonDto> {
  const res = await db.execute(sql`
    SELECT
      id,
      product_id,
      addon_type::text AS addon_type,
      code,
      name,
      price::text AS price,
      currency,
      state::text AS state,
      created_at
    FROM product_addons
    WHERE (id::text = ${addonIdOrCode} OR code = ${addonIdOrCode})
      AND state = 'ACTIVE'
    LIMIT 1
  `);

  if (res.rows.length === 0) {
    throw new ContractError('NOT_FOUND', `Add-on "${addonIdOrCode}" not found.`);
  }

  const row = res.rows[0] as unknown as AddonRow;
  return {
    id: row.id,
    product_id: row.product_id,
    addon_type: row.addon_type,
    code: row.code,
    name: row.name,
    price: Number(row.price).toFixed(2),
    currency: row.currency,
    state: row.state,
    created_at: new Date(row.created_at).toISOString(),
  };
}

export async function createProductAddon(
  db: CatalogDatabase,
  input: CreateProductAddonInput,
): Promise<ProductAddonDto> {
  const res = await db.execute(sql`
    INSERT INTO product_addons (
      product_id,
      addon_type,
      code,
      name,
      price,
      currency
    ) VALUES (
      ${input.product_id ?? null},
      ${input.addon_type},
      ${input.code},
      ${input.name},
      ${input.price},
      ${input.currency ?? 'USD'}
    )
    ON CONFLICT (code)
    DO UPDATE SET
      name = EXCLUDED.name,
      price = EXCLUDED.price,
      currency = EXCLUDED.currency,
      state = 'ACTIVE'
    RETURNING
      id,
      product_id,
      addon_type::text AS addon_type,
      code,
      name,
      price::text AS price,
      currency,
      state::text AS state,
      created_at
  `);

  const row = res.rows[0] as unknown as AddonRow;
  return {
    id: row.id,
    product_id: row.product_id,
    addon_type: row.addon_type,
    code: row.code,
    name: row.name,
    price: Number(row.price).toFixed(2),
    currency: row.currency,
    state: row.state,
    created_at: new Date(row.created_at).toISOString(),
  };
}

export async function attachAddonToOrder(
  db: CatalogDatabase,
  input: {
    orderId: string;
    addonId: string;
    targetProductId?: string;
  },
): Promise<{ order: OrderDto; addon_item_id: string }> {
  // 1. Verify order exists and is PENDING_PAYMENT
  const orderRes = await db.execute(sql`
    SELECT id, state::text AS state, customer_id, subtotal::text AS subtotal, grand_total::text AS grand_total
    FROM orders
    WHERE id = ${input.orderId}
    LIMIT 1
  `);

  if (orderRes.rows.length === 0) {
    throw new ContractError('ORDER_NOT_FOUND', `Order "${input.orderId}" not found.`);
  }

  const orderRow = orderRes.rows[0] as {
    id: string;
    state: string;
    customer_id: string | null;
    subtotal: string;
    grand_total: string;
  };

  if (orderRow.state !== 'PENDING_PAYMENT') {
    throw new ContractError(
      'UNPROCESSABLE',
      `Cannot attach add-ons to order in "${orderRow.state}" state. Placed orders are immutable.`,
    );
  }

  // 2. Fetch addon
  const addon = await getProductAddon(db, input.addonId);
  const addonPriceNum = Number(addon.price);

  // 3. Insert separate order_items line
  const gemSnapshotJson = JSON.stringify({
    addon_id: addon.id,
    addon_type: addon.addon_type,
    target_product_id: input.targetProductId ?? null,
  });

  const itemRes = await db.execute(sql`
    INSERT INTO order_items (
      order_id,
      product_id,
      sku_snapshot,
      title_snapshot,
      gem_snapshot,
      quantity,
      unit_price,
      line_total,
      state
    ) VALUES (
      ${input.orderId},
      ${input.targetProductId ?? addon.product_id ?? null},
      ${addon.code},
      ${addon.name},
      ${gemSnapshotJson}::jsonb,
      1,
      ${addon.price},
      ${addon.price},
      'PENDING'
    )
    RETURNING id
  `);

  const addonItemId = (itemRes.rows[0] as { id: string }).id;

  // 4. Update order totals
  const newSubtotal = (Number(orderRow.subtotal) + addonPriceNum).toFixed(2);
  const newGrandTotal = (Number(orderRow.grand_total) + addonPriceNum).toFixed(2);

  await db.execute(sql`
    UPDATE orders
    SET subtotal = ${newSubtotal},
        grand_total = ${newGrandTotal},
        version = version + 1,
        updated_at = now()
    WHERE id = ${input.orderId}
  `);

  // 5. Append event to order_events
  await db.execute(sql`
    INSERT INTO order_events (
      order_id,
      from_state,
      to_state,
      actor_type,
      reason,
      metadata
    ) VALUES (
      ${input.orderId},
      'PENDING_PAYMENT',
      'PENDING_PAYMENT',
      'CUSTOMER',
      ${`Add-on attached: ${addon.name} (${addon.code})`},
      ${JSON.stringify({ addon_id: addon.id, addon_code: addon.code, line_total: addon.price })}::jsonb
    )
  `);

  // 6. Reload updated order
  const orders = await getCustomerOrders(db, orderRow.customer_id ?? '');
  const updatedOrder = orders.find((o) => o.id === input.orderId);
  if (!updatedOrder) {
    throw new ContractError('INTERNAL', 'Failed to reload updated order.');
  }

  return {
    order: updatedOrder,
    addon_item_id: addonItemId,
  };
}
