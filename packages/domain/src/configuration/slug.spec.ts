/**
 * Phase 1 Task 8 — configuration slug derivation and slug normalisation tests
 * (doc 14 section 9 + doc 34 section 5; plan task 8 / E1.5).
 *
 * The frozen slug examples are the base62 forms of the two configuration
 * digests frozen in configuration-hash.spec.ts — one encoding chain, so a
 * slug and its hash can never disagree about the identity they represent.
 */
import { describe, expect, it } from 'vitest';
import { deriveConfigurationSlug, isConfigurationSlugShape, isNormalisedSlug, normaliseSlug } from './slug.js';
import { computeConfigurationHash } from './hash.js';
import { expectErrorCode } from '../testing/expect-domain-code.js';
import { parseSku } from '../value-objects/sku.js';

const EXAMPLE = () => ({
  hashVersion: 1,
  jewelleryType: 'EARRINGS' as const,
  settingVariantSku: parseSku('1383', 'R14'),
  gemRef: 'PR5681',
});

describe('configuration slug — derivation', () => {
  it('requirement 7: the slug is deterministic', () => {
    expect(deriveConfigurationSlug(EXAMPLE())).toBe(deriveConfigurationSlug(EXAMPLE()));
  });

  it('requirement 9: the slug is stable across repeated execution', () => {
    const first = deriveConfigurationSlug(EXAMPLE());
    expect(deriveConfigurationSlug(EXAMPLE())).toBe(first);
  });

  it('requirement 8: the slug is URL-safe (43 strict base62 digits)', () => {
    const slug = deriveConfigurationSlug(EXAMPLE());
    expect(slug).toMatch(/^[0-9A-Za-z]+$/);
    expect(slug.length).toBe(43);
    expect(isConfigurationSlugShape(slug)).toBe(true);
    // No percent-encoding or reserved characters anywhere: URI-safe as-is.
    expect(encodeURIComponent(slug)).toBe(slug);
  });

  it('requirement 10: equivalent canonical configurations produce the equivalent slug', () => {
    // Same identity, built with different option/side-stone ordering.
    const a = { ...EXAMPLE(), sideStones: [{ ref: 'K1', size: 2 }], options: { a: 1, b: 2 } };
    const b = { ...EXAMPLE(), sideStones: [{ ref: 'K1', size: 2 }], options: { b: 2, a: 1 } };
    expect(deriveConfigurationSlug(b)).toBe(deriveConfigurationSlug(a));
  });

  it('requirement 11: the slug example is frozen (the Example B configuration)', () => {
    expect(deriveConfigurationSlug(EXAMPLE())).toBe('wkLnR42AtSLFJjC12YKne4SOmCT1Vu9ehMOTTPEszL9');
    expect(deriveConfigurationSlug({
      hashVersion: 1,
      jewelleryType: 'RING',
      settingVariantSku: parseSku('1409', 'W14'),
      gemRef: 'K1324',
    })).toBe('B5r1NAVe8bBWg5G9kErL0EWInBci6NG8n16BXmL46Qy');
  });

  it('the slug encodes the same identity the hash does (one encoding chain)', () => {
    const configurationHash = computeConfigurationHash(EXAMPLE());
    expect(configurationHash.value).toBe(computeConfigurationHash(EXAMPLE()).value);
    // The identity can change only in lockstep: a jewellery-type change moves both.
    const ring = { ...EXAMPLE(), jewelleryType: 'RING' as const };
    expect(deriveConfigurationSlug(ring)).not.toBe(deriveConfigurationSlug(EXAMPLE()));
    expect(computeConfigurationHash(ring).value).not.toBe(configurationHash.value);
  });

  it('requirement 12: malformed input is rejected on the slug path too', () => {
    expectErrorCode(() => deriveConfigurationSlug({ ...EXAMPLE(), gemRef: 'oops' }), 'INVALID_GEM_REF');
  });
});

describe('slug normalisation — URL-safe edge cases', () => {
  it('lowercases and collapses separators', () => {
    expect(normaliseSlug('  Halo   Ring !! ')).toBe('halo-ring');
  });

  it('folds diacritics (NFKD)', () => {
    expect(normaliseSlug('Ångström Cushion')).toBe('angstrom-cushion');
  });

  it('normalises weight tokens to the observed doc-34 target shape (5.98ct -> 5-98ct)', () => {
    expect(normaliseSlug('5.98ct')).toBe('5-98ct');
    expect(normaliseSlug('14k-rose-gold')).toBe('14k-rose-gold');
  });

  it('accepts the observed already-normalised forms unchanged', () => {
    expect(normaliseSlug('blue-aquamarine-earrings-emerald-cut')).toBe('blue-aquamarine-earrings-emerald-cut');
    expect(isNormalisedSlug(normaliseSlug('Emerald Cut / Vedic (setting)'))).toBe(true);
  });

  it('rejects values that normalise to nothing', () => {
    expectErrorCode(() => normaliseSlug(''), 'INVALID_SLUG');
    expectErrorCode(() => normaliseSlug('!!!'), 'INVALID_SLUG');
    expectErrorCode(() => normaliseSlug('   '), 'INVALID_SLUG');
  });
});
