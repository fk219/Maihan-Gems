/**
 * packages/domain/src/vendor/vendor.ts
 *
 * ADR-026 — the vendor lifecycle, as pure data.
 *
 *   PENDING -> APPROVED -> SUSPENDED -> APPROVED
 *   PENDING -> TERMINATED
 *   APPROVED -> TERMINATED
 *   SUSPENDED -> TERMINATED
 *
 * TERMINATED is terminal. A terminated vendor is never resurrected: its stock
 * and money history must stay attributable, and reopening it would orphan the
 * ledger narrative.
 *
 * Pure: no I/O, no clock. Money rounding is explicit (half-up to the minor
 * unit) because commission disputes are always about the last cent.
 */

export const VENDOR_STATES = Object.freeze([
  'PENDING',
  'APPROVED',
  'SUSPENDED',
  'TERMINATED',
] as const);

export type VendorState = (typeof VENDOR_STATES)[number];

const ALLOWED: Readonly<Record<VendorState, readonly VendorState[]>> = Object.freeze({
  PENDING: ['APPROVED', 'TERMINATED'],
  APPROVED: ['SUSPENDED', 'TERMINATED'],
  SUSPENDED: ['APPROVED', 'TERMINATED'],
  TERMINATED: [],
});

export class VendorTransitionError extends Error {
  constructor(readonly from: VendorState, readonly to: VendorState) {
    super(`VENDOR_TRANSITION: ${from} -> ${to} is not permitted`);
    this.name = 'VendorTransitionError';
  }
}

export function canTransitionVendor(from: VendorState, to: VendorState): boolean {
  return (ALLOWED[from] ?? []).includes(to);
}

export function assertVendorTransition(from: VendorState, to: VendorState): void {
  if (!canTransitionVendor(from, to)) throw new VendorTransitionError(from, to);
}

/** A vendor may list stock only while approved. */
export function canSell(state: VendorState): boolean {
  return state === 'APPROVED';
}

/**
 * Commission in minor units, half-up. `bps` is basis points (1500 = 15%).
 * Integer arithmetic avoids the classic 0.1 + 0.2 drift in money maths.
 */
export function computeCommissionMinor(subtotalMinor: bigint, bps: number): bigint {
  if (!Number.isInteger(bps) || bps < 0 || bps > 5000) {
    throw new Error(`COMMISSION: bps out of range: ${bps}`);
  }
  if (subtotalMinor < 0n) throw new Error('COMMISSION: negative subtotal');
  const numerator = subtotalMinor * BigInt(bps);
  return (numerator + 5000n) / 10000n;
}

export interface Split {
  readonly commissionMinor: bigint;
  readonly payableMinor: bigint;
}

/** Split a subtotal into platform commission and vendor payable. */
export function splitSubtotalMinor(subtotalMinor: bigint, bps: number): Split {
  const commissionMinor = computeCommissionMinor(subtotalMinor, bps);
  if (commissionMinor > subtotalMinor) throw new Error('COMMISSION: commission exceeds subtotal');
  return { commissionMinor, payableMinor: subtotalMinor - commissionMinor };
}
