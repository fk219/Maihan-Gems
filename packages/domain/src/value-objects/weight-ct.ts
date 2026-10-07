/**
 * packages/domain — WeightCt value object (doc 05 "Value objects").
 *
 * Carats as a NUMERIC(8,3) decimal string: at most 5 integral digits and 3
 * fractional digits, strictly positive (doc 05: "positive"). Positivity is the
 * domain rule for a physical stone's weight; the pair-total rule (a PAIR has
 * positive total weight) is additionally enforced by the database invariant
 * gemstones_pair_weight_ck. The ready-made "0.00ct" placeholder lives on
 * products.total_weight_ct (doc 10), which is not this value object.
 *
 * No arithmetic here. Per-stone weights are summed by TotalWeightCalculator
 * (doc 05) with decimal-string semantics when that arrives; a float never
 * touches a weight.
 */
import { DomainError } from '../errors.js';

declare const weightCtBrand: unique symbol;
export type WeightCt = string & { readonly [weightCtBrand]: 'WeightCt' };

/** NUMERIC(8,3): max 99999.999. */
const WEIGHT_PATTERN = /^\d+(\.\d{1,3})?$/;
const MAX_INTEGRAL_DIGITS = 5;

export function isWeightCtShape(value: string): boolean {
  if (!WEIGHT_PATTERN.test(value)) return false;
  const integral = value.split('.')[0] ?? '';
  return integral.length <= MAX_INTEGRAL_DIGITS;
}

export function isWeightCt(value: string): value is WeightCt {
  return isWeightCtShape(value) && Number(value) > 0;
}

export function parseWeightCt(value: string): WeightCt {
  if (!isWeightCtShape(value)) {
    throw new DomainError(
      'INVALID_WEIGHT_CT',
      `weight must be a decimal string with at most ${MAX_INTEGRAL_DIGITS} integral and 3 fractional digits (NUMERIC(8,3)); got "${value}"`,
    );
  }
  if (Number(value) <= 0) {
    throw new DomainError('INVALID_WEIGHT_CT', `weight must be positive; got "${value}"`);
  }
  return value as WeightCt;
}
