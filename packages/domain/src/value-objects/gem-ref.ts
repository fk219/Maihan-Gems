/**
 * packages/domain — GemRef value object (doc 05 "Value objects").
 *
 * `K<digits>` or `PR<digits>` — the stable physical identity of an individual
 * gemstone (K) or matched pair (PR). Validated in Phase 0: every stone
 * reference has exactly one weight and one dimension set across all its
 * products, so gem_ref is a genuine entity identity (doc 10 "Stone identity").
 *
 * The prefix semantics are INV-02/INV-03's evidence basis: `[VERIFIED]` PR
 * references appear only on earrings (113/113) and K references only on
 * ring/pendant/necklace with zero exceptions.
 *
 * Branding gives a compile-time guarantee that an arbitrary string cannot flow
 * into a GemRef parameter; only parseGemRef produces one. There is no
 * normalisation: the observed form is uppercase, and a lowercase input is a
 * data problem to surface, not to silently repair.
 */
import { DomainError } from '../errors.js';

declare const gemRefBrand: unique symbol;
export type GemRef = string & { readonly [gemRefBrand]: 'GemRef' };

const GEM_REF_PATTERN = /^(K|PR)\d+$/;

/** The pair prefix. PR means a matched pair (SoT 1.1; VERIFIED 113/113 on earrings). */
const PAIR_PREFIX = 'PR';

export function isGemRef(value: string): value is GemRef {
  return GEM_REF_PATTERN.test(value);
}

export function parseGemRef(value: string): GemRef {
  if (!isGemRef(value)) {
    throw new DomainError('INVALID_GEM_REF', `gem_ref must match ^(K|PR)\\d+$ (uppercase, e.g. K1324 or PR5681); got "${value}"`);
  }
  return value;
}

/** PR references are pairs; K references are single stones. */
export function isPairGemRef(ref: GemRef): boolean {
  return ref.startsWith(PAIR_PREFIX);
}
