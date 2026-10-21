import { DomainError } from '../errors.js';

/**
 * packages/domain/src/commerce/shipping-rules.ts
 *
 * P1-7 server-authoritative shipping: the client names a method; the SERVER
 * prices it. No shipping amount travels from the client into totals — the
 * checkpoint overwrites whatever amount arrives with the approved rate table
 * (fail-closed: an unknown method code is refused outright).
 */

export interface ShippingRate {
  readonly code: string;
  readonly name: string;
  /** Fixed rate charged for this method (exact 2dp string). */
  readonly amount: string;
  readonly estimatedDays: number;
}


/**
 * Approved rate table. Production pricing moves these into configuration
 * (plan §3.4 decision on shipping carriers); until then the table is the
 * ONLY source of shipping truth and is deliberately narrow.
 */
export const SHIPPING_RATE_TABLE: readonly ShippingRate[] = [
  { code: 'STANDARD_INSURED', name: 'Standard Insured Delivery', amount: '15.00', estimatedDays: 6 },
  { code: 'EXPRESS', name: 'Express Insured Delivery', amount: '25.00', estimatedDays: 2 },
  { code: 'SECURE_COURIER', name: 'Armored Courier', amount: '50.00', estimatedDays: 1 },
];

function normaliseCode(code: string): string {
  return code.trim().toUpperCase();
}

export function findShippingRate(code: string): ShippingRate | undefined {
  const lookup = normaliseCode(code);
  return SHIPPING_RATE_TABLE.find((rate) => rate.code === lookup);
}

/**
 * Resolution contract:
 *   - unknown code            => ContractError('VALIDATION_FAILED', ...)
 *   - known code              => the TABLE's rate is authoritative; the
 *                                client `amount` is ignored outright.
 */
export function resolveAuthoritativeShippingMethod(
  input: { readonly code: string; readonly name?: string; readonly amount?: string; readonly estimated_days?: number },
): { readonly code: string; readonly name: string; readonly amount: string; readonly estimated_days: number } {
  const rate = findShippingRate(input.code);
  if (!rate) {
    throw new DomainError('UNKNOWN_SHIPPING_METHOD', `Unknown shipping method "${input.code}".`);
  }
  return {
    code: rate.code,
    name: rate.name,
    amount: rate.amount,
    estimated_days: rate.estimatedDays,
  };
}
