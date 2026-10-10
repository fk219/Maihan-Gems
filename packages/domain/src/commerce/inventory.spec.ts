import { describe, expect, it } from 'vitest';
import {
  assertGemstoneReservable,
  assertPairReservable,
  computeReservationExpiry,
  isReservationExpired,
} from './inventory.js';
import { expectErrorCode } from '../testing/expect-domain-code.js';

describe('Inventory Reservation Domain (Phase 6 Task 2)', () => {
  it('allows reservation when gemstone is available and not reserved', () => {
    expect(() =>
      assertGemstoneReservable({
        gemstoneId: 'gem_1',
        gemRef: 'K1324',
        isPair: false,
        isAvailable: true,
        isAlreadyReserved: false,
      }),
    ).not.toThrow();
  });

  it('rejects reservation with OUT_OF_STOCK when gemstone is unavailable', () => {
    expectErrorCode(
      () =>
        assertGemstoneReservable({
          gemstoneId: 'gem_1',
          gemRef: 'K1324',
          isPair: false,
          isAvailable: false,
          isAlreadyReserved: false,
        }),
      'OUT_OF_STOCK',
    );
  });

  it('rejects reservation with ALREADY_RESERVED when gemstone has active reservation', () => {
    expectErrorCode(
      () =>
        assertGemstoneReservable({
          gemstoneId: 'gem_1',
          gemRef: 'K1324',
          isPair: false,
          isAvailable: true,
          isAlreadyReserved: true,
        }),
      'ALREADY_RESERVED',
    );
  });

  it('enforces atomic pair reservation: succeeds only when BOTH stones are reservable', () => {
    const stoneA = {
      gemstoneId: 'gem_a',
      gemRef: 'PR5681-1',
      isPair: true,
      isAvailable: true,
      isAlreadyReserved: false,
    };
    const stoneB = {
      gemstoneId: 'gem_b',
      gemRef: 'PR5681-2',
      isPair: true,
      isAvailable: true,
      isAlreadyReserved: false,
    };

    expect(() => assertPairReservable([stoneA, stoneB])).not.toThrow();
  });

  it('rejects pair reservation with PAIR_RESERVATION_FAILED if either stone is unavailable', () => {
    const stoneA = {
      gemstoneId: 'gem_a',
      gemRef: 'PR5681-1',
      isPair: true,
      isAvailable: true,
      isAlreadyReserved: false,
    };
    const stoneB = {
      gemstoneId: 'gem_b',
      gemRef: 'PR5681-2',
      isPair: true,
      isAvailable: false,
      isAlreadyReserved: false,
    };

    expectErrorCode(() => assertPairReservable([stoneA, stoneB]), 'PAIR_RESERVATION_FAILED');
  });

  it('computes 30-minute reservation TTL and verifies expiry check', () => {
    const start = new Date(1700000000000);
    const expiry = computeReservationExpiry(start, 30);
    expect(expiry.getTime()).toBe(start.getTime() + 30 * 60 * 1000);

    const beforeExpiry = new Date(start.getTime() + 15 * 60 * 1000);
    const afterExpiry = new Date(start.getTime() + 31 * 60 * 1000);

    expect(isReservationExpired(expiry, beforeExpiry)).toBe(false);
    expect(isReservationExpired(expiry, afterExpiry)).toBe(true);
  });
});
