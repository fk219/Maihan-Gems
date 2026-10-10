/**
 * packages/domain/src/commerce/cart.ts
 *
 * Phase 6 Task 1 — Cart domain models and pure pricing / invariant functions.
 *
 * Domain rules:
 * - Quantities are positive integers (SMALLINT in Postgres CHECK quantity > 0).
 * - Amounts are decimal strings NUMERIC(12,2) with exactly 2 decimal digits.
 * - Subtotal is the sum of (unit_price * quantity) for all lines.
 * - Grand total = max(0, subtotal - discount_total + shipping_total + tax_total).
 * - Pricing snapshots on carts are ADVISORY ONLY; re-pricing always computes
 *   from authoritative database values.
 * - Client expected price is validated strictly: if client provides an expected
 *   price that diverges from the authoritative price, reject with PRICE_CHANGED.
 */
import { DomainError } from '../errors.js';

export type CartState = 'ACTIVE' | 'CONVERTED' | 'ABANDONED' | 'EXPIRED';

export interface CartPricingSnapshot {
  readonly currency: 'USD';
  readonly subtotal: string;
  readonly discount_total: string;
  readonly shipping_total: string;
  readonly tax_total: string;
  readonly grand_total: string;
  readonly item_count: number;
  readonly computed_at: string;
}

export interface CartPricingInputItem {
  readonly unitPrice: string;
  readonly quantity: number;
}

export interface PricingSnapshotOptions {
  readonly discountTotal?: string;
  readonly shippingTotal?: string;
  readonly taxTotal?: string;
  readonly computedAt?: string;
}

/** Parses numeric string to cents (integer) to avoid IEEE-754 float drift. */
export function toCents(amount: string): bigint {
  const trimmed = amount.trim();
  const parts = trimmed.split('.');
  const integerPart = parts[0] ?? '0';
  const fractionalPart = (parts[1] ?? '').padEnd(2, '0').slice(0, 2);
  const sign = integerPart.startsWith('-') ? -1n : 1n;
  const absInteger = integerPart.replace('-', '');
  const cents = BigInt(absInteger) * 100n + BigInt(fractionalPart);
  return sign * cents;
}

/** Formats bigint cents back to exact 2-decimal string. */
export function fromCents(cents: bigint): string {
  const isNegative = cents < 0n;
  const abs = isNegative ? -cents : cents;
  const dollars = abs / 100n;
  const rem = abs % 100n;
  const remStr = rem.toString().padStart(2, '0');
  const result = `${dollars.toString()}.${remStr}`;
  return isNegative ? `-${result}` : result;
}

/** Multiply decimal price by integer quantity. */
export function computeLineTotal(unitPrice: string, quantity: number): string {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new DomainError('INVALID_QUANTITY', `Quantity must be a positive integer; got ${quantity}`);
  }
  const unitCents = toCents(unitPrice);
  const lineCents = unitCents * BigInt(quantity);
  return fromCents(lineCents);
}

/** Validates cart item quantity. Max single line quantity 99. */
export function assertValidQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
    throw new DomainError('INVALID_QUANTITY', `Quantity must be an integer between 1 and 99; got ${quantity}`);
  }
}

/** Engraving validation: max 50 chars, single line, no control characters. */
const ENGRAVING_ALLOWED_PATTERN = /^[a-zA-Z0-9 .,'’"&!?-]{0,50}$/;

export function assertValidEngraving(text?: string | null): void {
  if (text === undefined || text === null || text === '') return;
  if (!ENGRAVING_ALLOWED_PATTERN.test(text)) {
    throw new DomainError(
      'INVALID_ENGRAVING_TEXT',
      `Engraving text exceeds 50 characters or contains disallowed characters: "${text}"`,
    );
  }
}

/** Asserts cart is not expired. */
export function assertCartNotExpired(expiresAt: Date | string, now: Date = new Date()): void {
  const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  if (now.getTime() > expiryDate.getTime()) {
    throw new DomainError('CART_EXPIRED', `Cart expired at ${expiryDate.toISOString()}`);
  }
}

/**
 * Computes authoritative pricing snapshot from line items.
 */
export function computeCartPricingSnapshot(
  items: readonly CartPricingInputItem[],
  options: PricingSnapshotOptions = {},
): CartPricingSnapshot {
  let subtotalCents = 0n;
  let totalItemCount = 0;

  for (const item of items) {
    assertValidQuantity(item.quantity);
    const lineCents = toCents(item.unitPrice) * BigInt(item.quantity);
    subtotalCents += lineCents;
    totalItemCount += item.quantity;
  }

  const discountCents = options.discountTotal !== undefined ? toCents(options.discountTotal) : 0n;
  const shippingCents = options.shippingTotal !== undefined ? toCents(options.shippingTotal) : 0n;
  const taxCents = options.taxTotal !== undefined ? toCents(options.taxTotal) : 0n;

  let grandTotalCents = subtotalCents - discountCents + shippingCents + taxCents;
  if (grandTotalCents < 0n) {
    grandTotalCents = 0n;
  }

  return {
    currency: 'USD',
    subtotal: fromCents(subtotalCents),
    discount_total: fromCents(discountCents),
    shipping_total: fromCents(shippingCents),
    tax_total: fromCents(taxCents),
    grand_total: fromCents(grandTotalCents),
    item_count: totalItemCount,
    computed_at: options.computedAt ?? new Date().toISOString(),
  };
}

/**
 * Validates whether client expected price matches authoritative server price.
 * Returns true if match, false if price changed.
 */
export function comparePriceMatch(expectedPrice: string | undefined, authoritativePrice: string): boolean {
  if (expectedPrice === undefined || expectedPrice === '') return true;
  return toCents(expectedPrice) === toCents(authoritativePrice);
}
