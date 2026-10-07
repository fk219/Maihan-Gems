import { describe, expect, expectTypeOf, it } from 'vitest';
import { parseSourceSku, type SourceSku } from './source-sku.js';
import { parseDerivedSku, type DerivedSku, type ProductIdentity } from './derived-sku.js';
import { expectErrorCode } from '../testing/expect-domain-code.js';

const PROVENANCE = { method: 'URL_SLUG', parserVersion: '0.1.0', confidence: 1 } as const;

describe('DerivedSku', () => {
  it('accepts a derived identity with its provenance', () => {
    const derived = parseDerivedSku('JS1150W10-K1324', PROVENANCE);
    expect(derived.sku).toBe('JS1150W10-K1324');
    expect(derived.provenance).toEqual(PROVENANCE);
  });

  it('validates provenance bounds deterministically', () => {
    expectErrorCode(
      () => parseDerivedSku('JS1150W10', { method: 'URL_SLUG', parserVersion: '0.1.0', confidence: 1.0001 }),
      'INVALID_DERIVED_SKU_PROVENANCE',
    );
    expectErrorCode(
      () => parseDerivedSku('JS1150W10', { method: 'URL_SLUG', parserVersion: '0.1.0', confidence: -0.01 }),
      'INVALID_DERIVED_SKU_PROVENANCE',
    );
    expectErrorCode(
      () => parseDerivedSku('JS1150W10', { method: 'URL_SLUG', parserVersion: '', confidence: 1 }),
      'INVALID_DERIVED_SKU_PROVENANCE',
    );
  });

  it('applies the same minimal identity validation as SourceSku', () => {
    expectErrorCode(() => parseDerivedSku('js1150w10', PROVENANCE), 'INVALID_DERIVED_SKU');
    expectErrorCode(() => parseDerivedSku('', PROVENANCE), 'INVALID_DERIVED_SKU');
    expectErrorCode(() => parseDerivedSku('JS 1150', PROVENANCE), 'INVALID_DERIVED_SKU');
  });

  it('the identity union is discriminated: DERIVED is structurally not OBSERVED', () => {
    const observed: ProductIdentity = { kind: 'OBSERVED', sku: parseSourceSku('JS1150W10') };
    const derived: ProductIdentity = { kind: 'DERIVED', sku: parseDerivedSku('JS1150W10-K1324', PROVENANCE) };
    expectTypeOf(observed.sku).toEqualTypeOf<SourceSku>();
    expectTypeOf(derived.sku).toEqualTypeOf<DerivedSku>();
    // A discriminated union narrows by kind — a DERIVED branch can never
    // expose a SourceSku and vice versa.
    const kind = observed.kind;
    expect(kind).toBe('OBSERVED');
  });
});
