/**
 * packages/domain — DimensionsMm value object (doc 05 "Value objects").
 *
 * Length, width and depth in millimetres as NUMERIC(8,3) decimal strings.
 * doc 05's validation rule: "each positive; depth <= min(length, width) is a
 * WARN not an error, because source data is noisy" — the D9 evidence contains
 * real records where the recorded depth exceeds a recorded dimension, and the
 * architecture decided those are warnings, not rejections.
 *
 * parseDimensionsMm therefore rejects only structural invalidity (shape,
 * positivity, precision) and never the depth anomaly; the anomaly is reported
 * by dimensionWarnings as a named warning for quarantine-style handling.
 */
import { DomainError } from '../errors.js';

/** NUMERIC(8,3): max 99999.999. */
const DIMENSION_PATTERN = /^\d+(\.\d{1,3})?$/;
const MAX_INTEGRAL_DIGITS = 5;

export interface DimensionsMm {
  readonly lengthMm: string;
  readonly widthMm: string;
  readonly depthMm: string;
}

/** The named dimension warning codes (stable identifiers). */
export type DimensionWarning = 'DEPTH_EXCEEDS_MIN_DIMENSION';

function validDimensionShape(value: string): boolean {
  if (!DIMENSION_PATTERN.test(value)) return false;
  const integral = value.split('.')[0] ?? '';
  return integral.length <= MAX_INTEGRAL_DIGITS;
}

export function isDimensionShape(value: string): boolean {
  return validDimensionShape(value);
}

export function parseDimensionsMm(lengthMm: string, widthMm: string, depthMm: string): DimensionsMm {
  for (const [name, value] of [['length_mm', lengthMm], ['width_mm', widthMm], ['depth_mm', depthMm]] as const) {
    if (!validDimensionShape(value)) {
      throw new DomainError(
        'INVALID_DIMENSIONS_MM',
        `${name} must be a positive decimal string with at most ${MAX_INTEGRAL_DIGITS} integral and 3 fractional digits (NUMERIC(8,3)); got "${value}"`,
      );
    }
    if (Number(value) <= 0) {
      throw new DomainError('INVALID_DIMENSIONS_MM', `${name} must be positive; got "${value}"`);
    }
  }
  return Object.freeze({ lengthMm, widthMm, depthMm } as const);
}

/** Pure: reports the noisy-source depth anomaly; never throws. */
export function dimensionWarnings(d: DimensionsMm): readonly DimensionWarning[] {
  const minSide = Math.min(Number(d.lengthMm), Number(d.widthMm));
  return Number(d.depthMm) > minSide ? ['DEPTH_EXCEEDS_MIN_DIMENSION'] : [];
}
