/**
 * packages/domain/src/commerce/inventory.ts
 *
 * Phase 6 Task 2 & Task 12 — Inventory reservation domain logic and invariants.
 *
 * Authority:
 * - technical_design/15 INVENTORY ARCHITECTURE §21-71.
 * - Invariant: A loose stone or pair is a single unit; each physical gemstone is unique.
 * - Invariant: Pair reservation in earrings is ATOMIC: both stones must be reserved,
 *   or neither is reserved (INV-02).
 * - Reservations carry a 30-minute TTL.
 */
import { DomainError } from '../errors.js';

export const RESERVATION_TTL_MINUTES = 30;

export interface GemstoneReservationSpec {
  readonly gemstoneId: string;
  readonly gemRef: string;
  readonly isPair: boolean;
  readonly isAvailable: boolean;
  readonly isAlreadyReserved: boolean;
}

/**
 * Asserts that a single gemstone is eligible for reservation.
 */
export function assertGemstoneReservable(stone: GemstoneReservationSpec): void {
  if (!stone.isAvailable) {
    throw new DomainError('OUT_OF_STOCK', `Gemstone ${stone.gemRef} is not available for purchase.`);
  }
  if (stone.isAlreadyReserved) {
    throw new DomainError('ALREADY_RESERVED', `Gemstone ${stone.gemRef} is currently held under an active reservation.`);
  }
}

/**
 * Asserts atomic reservation for a pair of gemstones (e.g. Earrings).
 * If either stone is unavailable or reserved, throws PAIR_RESERVATION_FAILED.
 */
export function assertPairReservable(stones: readonly GemstoneReservationSpec[]): void {
  if (stones.length === 0) {
    throw new DomainError('PAIR_RESERVATION_FAILED', 'No gemstones provided for pair reservation.');
  }

  for (const stone of stones) {
    if (!stone.isAvailable || stone.isAlreadyReserved) {
      throw new DomainError(
        'PAIR_RESERVATION_FAILED',
        `Atomic pair reservation failed: stone ${stone.gemRef} is ${
          !stone.isAvailable ? 'out of stock' : 'already reserved'
        }. Neither stone is reserved.`,
      );
    }
  }
}

/**
 * Computes reservation expiry time given start time and TTL.
 */
export function computeReservationExpiry(from: Date = new Date(), ttlMinutes = RESERVATION_TTL_MINUTES): Date {
  return new Date(from.getTime() + ttlMinutes * 60 * 1000);
}

/**
 * Checks whether a reservation has expired.
 */
export function isReservationExpired(expiresAt: Date | string, now: Date = new Date()): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return now.getTime() > expiry.getTime();
}
