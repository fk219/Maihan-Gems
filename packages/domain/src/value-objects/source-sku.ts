/**
 * packages/domain — SourceSku value object (doc 05 "The DerivedSku type").
 *
 * An OBSERVED SKU — a value that came from `product.sku` in the source
 * evidence and from nowhere else. The load-bearing rule (doc 05, enforced by
 * construction): a derived identity may never be written to the observed
 * channel, and an observed identity is never manufactured.
 *
 * `must be uppercase-normalised`: the observed form in the evidence is
 * uppercase, so this object REQUIRES uppercase input and rejects anything
 * else. It deliberately does not uppercase-lowercase input — silently
 * repairing a source value would manufacture a different identifier than the
 * one observed.
 *
 * This is NOT the SKU grammar. Shape validation beyond the minimal identity
 * rules belongs to the SKU grammar parser (plan task 7).
 */
import { DomainError } from '../errors.js';

declare const sourceSkuBrand: unique symbol;
export type SourceSku = string & { readonly [sourceSkuBrand]: 'SourceSku' };

export function isSourceSku(value: string): value is SourceSku {
  return value.length > 0 && value === value.toUpperCase() && !/\s/.test(value);
}

export function parseSourceSku(value: string): SourceSku {
  if (!isSourceSku(value)) {
    throw new DomainError(
      'INVALID_SOURCE_SKU',
      `a source SKU must be a non-empty, whitespace-free, uppercase-normalised observed value; got "${value}"`,
    );
  }
  return value;
}
