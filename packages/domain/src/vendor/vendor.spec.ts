/**
 * packages/domain/src/vendor/vendor.spec.ts
 *
 * ADR-026 — the two properties that cost real money if they are wrong:
 * a terminated vendor can never be revived, and the commission split always
 * adds back to the subtotal with no lost cent.
 */
import { describe, expect, it } from 'vitest';
import {
  assertVendorTransition,
  canSell,
  canTransitionVendor,
  computeCommissionMinor,
  splitSubtotalMinor,
  VendorTransitionError,
} from './vendor.js';

describe('vendor lifecycle', () => {
  it('permits the documented transitions', () => {
    expect(canTransitionVendor('PENDING', 'APPROVED')).toBe(true);
    expect(canTransitionVendor('PENDING', 'TERMINATED')).toBe(true);
    expect(canTransitionVendor('APPROVED', 'SUSPENDED')).toBe(true);
    expect(canTransitionVendor('SUSPENDED', 'APPROVED')).toBe(true);
    expect(canTransitionVendor('APPROVED', 'TERMINATED')).toBe(true);
  });

  it('refuses illegal transitions, including resurrection', () => {
    expect(canTransitionVendor('TERMINATED', 'APPROVED')).toBe(false);
    expect(canTransitionVendor('PENDING', 'SUSPENDED')).toBe(false);
    expect(canTransitionVendor('APPROVED', 'PENDING')).toBe(false);
    expect(() => assertVendorTransition('TERMINATED', 'APPROVED')).toThrow(VendorTransitionError);
  });

  it('lets only an approved vendor sell', () => {
    expect(canSell('APPROVED')).toBe(true);
    expect(canSell('PENDING')).toBe(false);
    expect(canSell('SUSPENDED')).toBe(false);
    expect(canSell('TERMINATED')).toBe(false);
  });
});

describe('commission', () => {
  it('computes basis points exactly', () => {
    expect(computeCommissionMinor(10000n, 1500)).toBe(1500n); // 15% of 100.00
    expect(computeCommissionMinor(0n, 1500)).toBe(0n);
    expect(computeCommissionMinor(10000n, 0)).toBe(0n);
  });

  it('rounds half-up, never down', () => {
    expect(computeCommissionMinor(1n, 1500)).toBe(0n); // 0.15 -> 0
    expect(computeCommissionMinor(4n, 1500)).toBe(1n); // 0.60 -> 1
    expect(computeCommissionMinor(3n, 5000)).toBe(2n); // 1.50 -> 2
  });

  it('always splits back to the subtotal', () => {
    for (const subtotal of [0n, 1n, 999n, 10000n, 123456789n]) {
      for (const bps of [0, 1, 999, 1500, 5000]) {
        const { commissionMinor, payableMinor } = splitSubtotalMinor(subtotal, bps);
        expect(commissionMinor + payableMinor).toBe(subtotal);
      }
    }
  });

  it('rejects an out-of-range commission', () => {
    expect(() => computeCommissionMinor(100n, -1)).toThrow();
    expect(() => computeCommissionMinor(100n, 5001)).toThrow();
    expect(() => computeCommissionMinor(-1n, 100)).toThrow();
  });
});
