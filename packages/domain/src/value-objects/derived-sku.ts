/**
 * packages/domain — DerivedSku value object and the ProductIdentity union
 * (doc 05 "The DerivedSku type (critical)").
 *
 * The locked architecture forbids manufacturing source SKUs (ADR-008). It is
 * enforced HERE in the type system, not by convention:
 *
 *   - ProductIdentity is a discriminated union: OBSERVED carries a SourceSku,
 *     DERIVED carries a DerivedSku. There is no shape in which a derived value
 *     can flow into an observed channel or vice versa without an explicit,
 *     reviewable branch.
 *   - A DerivedSku always carries its provenance: the derivation method,
 *     the parser version that produced it and the parse confidence — so the
 *     evidence status of the identity is never lost.
 *   - The 221 failed-fetch identities stay sku_evidence_status='INFERRED',
 *     state='DRAFT' with null attributes (ADR-008); that mapping is the
 *     importer's job, and the type below is what makes the derived value
 *     impossible to mistake for an observed one.
 *
 * This file implements NO parsing. The SKU grammar parser is plan task 7; the
 * shape rule here is only the minimal identity validation shared with
 * SourceSku (uppercase-normalised, non-empty, whitespace-free).
 */
import { DomainError } from '../errors.js';
import type { SourceSku } from './source-sku.js';

export interface DerivedSkuProvenance {
  /** How the identity was derived. URL_SLUG is the only method in the evidence. */
  readonly method: 'URL_SLUG';
  /** The parser version that produced the identity (set once a parser exists, plan task 7). */
  readonly parserVersion: string;
  /** Parse confidence, 0..1 inclusive (NUMERIC(4,3) semantics; 1.000 = certain). */
  readonly confidence: number;
}

export interface DerivedSku {
  readonly sku: string;
  readonly provenance: DerivedSkuProvenance;
}

/** The observed-or-derived identity of a product; the discriminated kind is the gate. */
export type ProductIdentity =
  | { readonly kind: 'OBSERVED'; readonly sku: SourceSku }
  | { readonly kind: 'DERIVED'; readonly sku: DerivedSku };

function validSkuShape(value: string): boolean {
  return value.length > 0 && value === value.toUpperCase() && !/\s/.test(value);
}

export function isDerivedSkuShape(value: string): boolean {
  return validSkuShape(value);
}

export function parseDerivedSku(sku: string, provenance: DerivedSkuProvenance): DerivedSku {
  if (!validSkuShape(sku)) {
    throw new DomainError(
      'INVALID_DERIVED_SKU',
      `a derived SKU must be a non-empty, whitespace-free, uppercase-normalised value; got "${sku}"`,
    );
  }
  if (!/^\S+$/.test(provenance.parserVersion) || provenance.parserVersion.length === 0) {
    throw new DomainError('INVALID_DERIVED_SKU_PROVENANCE', 'parserVersion must be a non-empty version identifier');
  }
  if (!Number.isFinite(provenance.confidence) || provenance.confidence < 0 || provenance.confidence > 1) {
    throw new DomainError('INVALID_DERIVED_SKU_PROVENANCE', 'confidence must be a number in [0, 1]');
  }
  return Object.freeze({ sku, provenance: Object.freeze({ ...provenance }) } as const);
}
