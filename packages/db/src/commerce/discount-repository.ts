/**
 * packages/db/src/commerce/discount-repository.ts
 *
 * Phase 6 Task 10 — Discount validation & redemption repository.
 *
 * Authority:
 * - technical_design/13 COMMERCE ARCHITECTURE §Discounts.
 * - Invariant: Server-side validation (scope, window, minimum, per-customer limit, redemption count).
 * - Anti-race: Atomic redemption_count increment inside checkout transaction.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import {
  ContractError,
  type CreateDiscountInput,
  type DiscountDto,
  type DiscountScope,
  type ValidateDiscountInput,
  type ValidateDiscountResultDto,
} from '@maihan/contracts';

interface DiscountRow {
  id: string;
  code: string | null;
  name: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING' | 'FINANCING' | 'PROTECTION_PLAN';
  value: string | null;
  currency: string | null;
  scope: DiscountScope;
  min_subtotal: string | null;
  max_redemptions: number | null;
  redemption_count: number;
  per_customer_limit: number | null;
  valid_from: string;
  valid_to: string | null;
  state: string;
  created_at: string;
}

function mapDiscountRow(row: DiscountRow): DiscountDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    value: row.value ? Number(row.value).toFixed(2) : null,
    currency: row.currency,
    scope: (row.scope as DiscountScope) ?? {},
    min_subtotal: row.min_subtotal ? Number(row.min_subtotal).toFixed(2) : null,
    max_redemptions: row.max_redemptions,
    redemption_count: row.redemption_count ?? 0,
    per_customer_limit: row.per_customer_limit,
    valid_from: new Date(row.valid_from).toISOString(),
    valid_to: row.valid_to ? new Date(row.valid_to).toISOString() : null,
    state: row.state,
    created_at: new Date(row.created_at).toISOString(),
  };
}

export async function createDiscount(
  db: CatalogDatabase,
  input: CreateDiscountInput,
): Promise<DiscountDto> {
  const scopeJson = JSON.stringify(input.scope ?? {});
  const res = await db.execute(sql`
    INSERT INTO discounts (
      code,
      name,
      type,
      value,
      currency,
      scope,
      min_subtotal,
      max_redemptions,
      per_customer_limit,
      valid_from,
      valid_to
    ) VALUES (
      ${input.code},
      ${input.name},
      ${input.type},
      ${input.value ?? null},
      ${input.currency ?? null},
      ${scopeJson}::jsonb,
      ${input.min_subtotal ?? null},
      ${input.max_redemptions ?? null},
      ${input.per_customer_limit ?? null},
      COALESCE(${input.valid_from ?? null}::timestamptz, now()),
      ${input.valid_to ?? null}::timestamptz
    )
    ON CONFLICT (code)
    DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      value = EXCLUDED.value,
      currency = EXCLUDED.currency,
      scope = EXCLUDED.scope,
      min_subtotal = EXCLUDED.min_subtotal,
      max_redemptions = EXCLUDED.max_redemptions,
      per_customer_limit = EXCLUDED.per_customer_limit,
      valid_from = EXCLUDED.valid_from,
      valid_to = EXCLUDED.valid_to,
      state = 'ACTIVE'
    RETURNING
      id,
      code,
      name,
      type::text AS type,
      value::text AS value,
      currency,
      scope,
      min_subtotal::text AS min_subtotal,
      max_redemptions,
      redemption_count,
      per_customer_limit,
      valid_from,
      valid_to,
      state::text AS state,
      created_at
  `);

  return mapDiscountRow(res.rows[0] as unknown as DiscountRow);
}

export async function getDiscountByCode(
  db: CatalogDatabase,
  code: string,
): Promise<DiscountDto> {
  const res = await db.execute(sql`
    SELECT
      id,
      code,
      name,
      type::text AS type,
      value::text AS value,
      currency,
      scope,
      min_subtotal::text AS min_subtotal,
      max_redemptions,
      redemption_count,
      per_customer_limit,
      valid_from,
      valid_to,
      state::text AS state,
      created_at
    FROM discounts
    WHERE code = ${code}
      AND state = 'ACTIVE'
    LIMIT 1
  `);

  if (res.rows.length === 0) {
    throw new ContractError('DISCOUNT_INVALID', `Discount code "${code}" not found or inactive.`);
  }

  return mapDiscountRow(res.rows[0] as unknown as DiscountRow);
}

export async function validateDiscount(
  db: CatalogDatabase,
  input: ValidateDiscountInput,
): Promise<ValidateDiscountResultDto> {
  const discount = await getDiscountByCode(db, input.code);

  const now = new Date();
  const validFrom = new Date(discount.valid_from);
  const validTo = discount.valid_to ? new Date(discount.valid_to) : null;

  // 1. Window check
  if (now < validFrom || (validTo && now > validTo)) {
    throw new ContractError('DISCOUNT_INVALID', 'Discount code has expired or is not yet active.');
  }

  // 2. Minimum subtotal check
  if (discount.min_subtotal !== null && input.subtotal < Number(discount.min_subtotal)) {
    throw new ContractError(
      'DISCOUNT_INVALID',
      `Order subtotal ($${input.subtotal.toFixed(2)}) is below the required minimum of $${discount.min_subtotal}.`,
    );
  }

  // 3. Max redemptions check
  if (discount.max_redemptions !== null && discount.redemption_count >= discount.max_redemptions) {
    throw new ContractError('DISCOUNT_INVALID', 'Discount code has reached its maximum redemptions.');
  }

  // 4. Per customer limit check
  if (discount.per_customer_limit !== null && input.customer_id) {
    const custRes = await db.execute(sql`
      SELECT count(*)::int AS count
      FROM orders
      WHERE customer_id = ${input.customer_id}
        AND (
          pricing_snapshot->'discount'->>'code' = ${discount.code}
          OR pricing_snapshot->'discount'->>'id' = ${discount.id}
        )
    `);
    const usedCount = (custRes.rows[0] as { count: number }).count ?? 0;
    if (usedCount >= discount.per_customer_limit) {
      throw new ContractError(
        'DISCOUNT_INVALID',
        `You have already reached the redemption limit (${discount.per_customer_limit}) for this discount code.`,
      );
    }
  }

  // 5. Scope check
  const scope = discount.scope;
  if (scope.products && scope.products.length > 0 && input.items && input.items.length > 0) {
    const hasMatchingProduct = input.items.some(
      (item) => item.product_id && scope.products!.includes(item.product_id),
    );
    if (!hasMatchingProduct) {
      throw new ContractError('DISCOUNT_INVALID', 'Discount code does not apply to items in your cart.');
    }
  }
  if (scope.varieties && scope.varieties.length > 0 && input.items && input.items.length > 0) {
    const hasMatchingVariety = input.items.some(
      (item) => item.variety && scope.varieties!.includes(item.variety),
    );
    if (!hasMatchingVariety) {
      throw new ContractError('DISCOUNT_INVALID', 'Discount code does not apply to gemstone varieties in your cart.');
    }
  }

  // 6. Calculate discount amount
  let discountAmount = 0;
  if (discount.type === 'PERCENTAGE') {
    const pct = Number(discount.value ?? 0);
    discountAmount = Math.min(input.subtotal, (input.subtotal * pct) / 100);
  } else if (discount.type === 'FIXED_AMOUNT') {
    const fixed = Number(discount.value ?? 0);
    discountAmount = Math.min(input.subtotal, fixed);
  } else if (discount.type === 'FREE_SHIPPING') {
    discountAmount = input.shipping_total ?? 0;
  }

  const finalSubtotal = Math.max(0, input.subtotal - discountAmount);

  return {
    valid: true,
    discount,
    discount_amount: discountAmount.toFixed(2),
    final_subtotal: finalSubtotal.toFixed(2),
  };
}

export async function redeemDiscount(
  db: CatalogDatabase,
  discountId: string,
): Promise<{ redemption_count: number }> {
  const res = await db.execute(sql`
    UPDATE discounts
    SET redemption_count = redemption_count + 1
    WHERE id = ${discountId}
      AND state = 'ACTIVE'
      AND (max_redemptions IS NULL OR redemption_count < max_redemptions)
    RETURNING redemption_count
  `);

  if (res.rows.length === 0) {
    throw new ContractError('DISCOUNT_INVALID', 'Discount redemption failed: maximum redemptions reached.');
  }

  return {
    redemption_count: (res.rows[0] as { redemption_count: number }).redemption_count,
  };
}
