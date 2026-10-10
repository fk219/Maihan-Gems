import { describe, expect, it } from 'vitest';
import {
  assertCartNotExpired,
  assertValidEngraving,
  assertValidQuantity,
  comparePriceMatch,
  computeCartPricingSnapshot,
  computeLineTotal,
  fromCents,
  toCents,
} from './cart.js';
import { expectErrorCode } from '../testing/expect-domain-code.js';

describe('Cart Domain Models (Phase 6 Task 1)', () => {
  it('converts decimal string to cents accurately without float error', () => {
    expect(toCents('1234.56')).toBe(123456n);
    expect(toCents('0.00')).toBe(0n);
    expect(toCents('10')).toBe(1000n);
    expect(toCents('0.5')).toBe(50n);
    expect(fromCents(123456n)).toBe('1234.56');
    expect(fromCents(50n)).toBe('0.50');
  });

  it('computes line total from unit price and integer quantity', () => {
    expect(computeLineTotal('150.25', 2)).toBe('300.50');
    expect(computeLineTotal('1200.00', 3)).toBe('3600.00');
    expectErrorCode(() => computeLineTotal('100.00', 0), 'INVALID_QUANTITY');
    expectErrorCode(() => computeLineTotal('100.00', -1), 'INVALID_QUANTITY');
    expectErrorCode(() => computeLineTotal('100.00', 1.5), 'INVALID_QUANTITY');
  });

  it('validates quantity bounds [1, 99]', () => {
    expect(() => assertValidQuantity(1)).not.toThrow();
    expect(() => assertValidQuantity(99)).not.toThrow();
    expectErrorCode(() => assertValidQuantity(0), 'INVALID_QUANTITY');
    expectErrorCode(() => assertValidQuantity(100), 'INVALID_QUANTITY');
  });

  it('validates engraving length and characters', () => {
    expect(() => assertValidEngraving('Forever & Always, 2026!')).not.toThrow();
    expect(() => assertValidEngraving(null)).not.toThrow();
    expect(() => assertValidEngraving('')).not.toThrow();
    // Exceeds 50 chars
    const longText = 'A'.repeat(51);
    expectErrorCode(() => assertValidEngraving(longText), 'INVALID_ENGRAVING_TEXT');
    // Disallowed control character
    expectErrorCode(() => assertValidEngraving('Bad\nText'), 'INVALID_ENGRAVING_TEXT');
  });

  it('computes complete cart pricing snapshot', () => {
    const items = [
      { unitPrice: '500.00', quantity: 2 },
      { unitPrice: '250.50', quantity: 1 },
    ];
    const snapshot = computeCartPricingSnapshot(items, {
      discountTotal: '50.00',
      shippingTotal: '25.00',
      taxTotal: '10.00',
      computedAt: '2026-10-10T00:00:00.000Z',
    });

    expect(snapshot.currency).toBe('USD');
    expect(snapshot.subtotal).toBe('1250.50');
    expect(snapshot.discount_total).toBe('50.00');
    expect(snapshot.shipping_total).toBe('25.00');
    expect(snapshot.tax_total).toBe('10.00');
    expect(snapshot.grand_total).toBe('1235.50');
    expect(snapshot.item_count).toBe(3);
    expect(snapshot.computed_at).toBe('2026-10-10T00:00:00.000Z');
  });

  it('validates cart expiration against current time', () => {
    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + 60000);
    expect(() => assertCartNotExpired(future)).not.toThrow();
    expectErrorCode(() => assertCartNotExpired(past), 'CART_EXPIRED');
  });

  it('validates expected client price against authoritative server price', () => {
    expect(comparePriceMatch('100.00', '100.00')).toBe(true);
    expect(comparePriceMatch(undefined, '100.00')).toBe(true);
    expect(comparePriceMatch('99.99', '100.00')).toBe(false);
  });
});
