/**
 * Phase 1 Task 8 — configuration-hash tests (SoT 19.2; doc 14 section 2;
 * plan task 8; requirement set 5 of the Task 8 authorisation).
 *
 * Frozen by explicit expected examples (requirement 11): the example
 * configuration is the validated SoT 28/3.1 Example B DYO identity
 * (earrings; setting JS1383R14; pair PR5681) — the observed slug
 * '/design-your-own/review/blue-aquamarine-earrings-emerald-cut-5.98ct-14k-
 * rose-gold-js1383r14-pr5681' carries exactly these identity tokens.
 *
 * The expected canonical JSON and digests below were computed by this
 * implementation and are frozen to catch any future drift in the canonical
 * representation: a changed digest means the canonical form changed, which
 * is a hash-version bump (hash_version inside the object), never a silent
 * rewrite.
 */
import { describe, expect, it } from 'vitest';
import {
  canonicaliseConfiguration,
  canonicalJson,
} from './canonical-configuration.js';
import {
  computeConfigurationDigest,
  computeConfigurationHash,
  computeConfigurationIdentity,
} from './hash.js';
import { computeConfigurationHash as reexported, computeConfigurationDigest as reexportedDigest } from './hash.js';
import { expectErrorCode } from '../testing/expect-domain-code.js';
import { parseSku } from '../value-objects/sku.js';
import { parseConfigurationHash } from '../value-objects/configuration-hash.js';

const SETTING_R14 = (): ReturnType<typeof parseSku> => parseSku('1383', 'R14');
const SETTING_W14 = (): ReturnType<typeof parseSku> => parseSku('1150', 'W14');

const EXAMPLE = () => ({
  hashVersion: 1,
  jewelleryType: 'EARRINGS' as const,
  settingVariantSku: SETTING_R14(),
  gemRef: 'PR5681',
});

describe('configuration hash — determinism', () => {
  it('requirement 1: the same canonical configuration produces the same hash', () => {
    expect(computeConfigurationHash(EXAMPLE()).value).toBe(computeConfigurationHash(EXAMPLE()).value);
  });

  it('requirement 2: different object key insertion order produces the same hash', () => {
    const a = {
      engravingText: undefined,
      gemRef: 'PR5681',
      hashVersion: 1,
      jewelleryType: 'EARRINGS' as const,
      options: undefined,
      settingVariantSku: SETTING_R14(),
      sideStones: undefined,
    };
    const b = {
      settingVariantSku: SETTING_R14(),
      sideStones: undefined,
      options: undefined,
      jewelleryType: 'EARRINGS' as const,
      hashVersion: 1,
      gemRef: 'PR5681',
      engravingText: undefined,
    };
    expect(computeConfigurationHash(a).value).toBe(computeConfigurationHash(b).value);
  });

  it('requirement 3: repeated execution is stable', () => {
    const first = computeConfigurationHash(EXAMPLE()).value;
    expect(computeConfigurationHash(EXAMPLE()).value).toBe(first);
    expect(computeConfigurationDigest(EXAMPLE()).equals(computeConfigurationDigest(EXAMPLE()))).toBe(true);
  });

  it('non-identity input is ignored: unknown extra keys and engraving text do not move the hash', () => {
    const withNoise = {
      ...EXAMPLE(),
      engravingText: undefined,
      // Keys not in the identity are structurally ignored by the canonical builder.
      presentationTitle: 'shop now (discount 10%)',
    } as unknown as Parameters<typeof computeConfigurationHash>[0];
    expect(computeConfigurationHash(withNoise).value).toBe(computeConfigurationHash(EXAMPLE()).value);
  });

  it('engraving PRESENCE is hashed; only the text is excluded (doc 14 section 2)', () => {
    const present = { ...EXAMPLE(), engravingText: 'anything at all' };
    expect(computeConfigurationHash(present).value).not.toBe(computeConfigurationHash(EXAMPLE()).value);
    const otherText = { ...EXAMPLE(), engravingText: 'different words entirely' };
    expect(computeConfigurationHash(otherText).value).toBe(computeConfigurationHash(present).value);
  });

  it('module and barrel surface agree (no second hash engine)', () => {
    expect(reexported).toBe(computeConfigurationHash);
    expect(reexportedDigest).toBe(computeConfigurationDigest);
  });
});

describe('configuration hash — identity sensitivity (requirement 5)', () => {
  const base = EXAMPLE();

  it.each([
    ['jewelleryType', { ...base, jewelleryType: 'RING' as const }],
    ['settingVariantSku', { ...base, settingVariantSku: SETTING_W14() }],
    ['gemRef', { ...base, gemRef: 'K1324' }],
    ['sideStones', { ...base, sideStones: [{ treatment: 'HEAT_TREATED' }] }],
    ['options', { ...base, options: { metalFinish: 'polished' } }],
  ])('changing the identity field %s changes the hash', (_field, changed) => {
    expect(computeConfigurationHash(changed).value).not.toBe(computeConfigurationHash(base).value);
  });

  it('side-stone and option ordering does not change the hash (arrays sorted, keys sorted)', () => {
    const a = { ...base, sideStones: [{ ref: 'K1', size: 2 }, { ref: 'K2', size: 1 }], options: { a: 1, b: 2 } };
    const shuffled = { ...base, sideStones: [{ ref: 'K2', size: 1 }, { ref: 'K1', size: 2 }], options: { b: 2, a: 1 } };
    expect(computeConfigurationHash(shuffled).value).toBe(computeConfigurationHash(a).value);
  });

  it('content-level difference inside side stones still changes the hash', () => {
    const a = { ...base, sideStones: [{ ref: 'K1', size: 2 }] };
    const b = { ...base, sideStones: [{ ref: 'K1', size: 3 }] };
    expect(computeConfigurationHash(b).value).not.toBe(computeConfigurationHash(a).value);
  });

  it('the hash version is part of the identity (SoT 19.2: option-set change = new hash space)', () => {
    expect(computeConfigurationHash({ ...base, hashVersion: 2 }).value).not.toBe(computeConfigurationHash(base).value);
  });
});

describe('configuration hash — shape, canonical representation and frozen examples', () => {
  it('requirement 4: the hash has the expected sha256/version format', () => {
    const hash = computeConfigurationHash(EXAMPLE());
    expect(hash.value).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(hash.hashVersion).toBe(1);
    expect(Object.isFrozen(hash)).toBe(true);
    // Task 6 value-object round-trip: parseConfigurationHash accepts it.
    expect(parseConfigurationHash(hash.value, hash.hashVersion)).toEqual(hash);
  });

  it('requirement 11: the canonical representation is explicit and frozen by example', () => {
    expect(computeConfigurationIdentity(EXAMPLE()).canonicalJson).toBe(
      '{"engravingPresent":false,"gemRef":"PR5681","hashVersion":1,"jewelleryType":"EARRINGS","options":{},"settingVariantSku":"JS1383R14","sideStones":[]}',
    );
    expect(computeConfigurationHash(EXAMPLE()).value).toBe(
      'sha256:885be45a3862d3213edce8c1e152996fd17ce6ed72d6d94226c91cd296548c77',
    );
  });

  it('requirement 11 (loose-stone identity example, from the observed SoT slug tail K1324/JS1409W14)', () => {
    expect(computeConfigurationHash({
      hashVersion: 1,
      jewelleryType: 'RING',
      settingVariantSku: parseSku('1409', 'W14'),
      gemRef: 'K1324',
    }).value).toBe('sha256:9c66da5cb458bd1b4ebb6d38ae21774d67f10c4705183fdff8056687fed82f22');
  });

  it('the canonical object excludes engraving text from the JSON, not just the hash', () => {
    const canonical = canonicaliseConfiguration({ ...EXAMPLE(), engravingText: 'private message' });
    expect(canonical.engravingPresent).toBe(true);
    expect(canonicalJson(canonical)).not.toContain('private message');
  });
});

describe('configuration input — malformed and invalid rejection (requirement 12)', () => {
  it('rejects a setting-variant SKU that carries a gem reference (INVALID_SKU)', () => {
    const configured = parseSku('1383', 'R14');
    // The configuration gemRef field takes the lowercase string (runtime form);
    // the SKU object here is the setting-only variant and must not embed a ref.
    expectErrorCode(
      () => canonicaliseConfiguration({ ...EXAMPLE(), settingVariantSku: { ...configured, gemRef: 'PR5681' as never } }),
      'INVALID_SKU',
    );
  });

  it('rejects an unknown jewellery type (INVALID_JEWELLERY_TYPE)', () => {
    expectErrorCode(
      () => canonicaliseConfiguration({ ...EXAMPLE(), jewelleryType: 'TOE_RING' as never }),
      'INVALID_JEWELLERY_TYPE',
    );
  });

  it('rejects a malformed gem reference (INVALID_GEM_REF) — including the lowercase form (no silent repair)', () => {
    expectErrorCode(() => canonicaliseConfiguration({ ...EXAMPLE(), gemRef: 'pr5681' }), 'INVALID_GEM_REF');
  });

  it('rejects a non-array sideStones value (INVALID_SIDE_STONES)', () => {
    expectErrorCode(
      () => canonicaliseConfiguration({ ...EXAMPLE(), sideStones: { ref: 'K1' } as never }),
      'INVALID_SIDE_STONES',
    );
  });

  it('rejects non-plain or non-JSON values instead of silently dropping them', () => {
    expectErrorCode(() => canonicaliseConfiguration({ ...EXAMPLE(), options: { a: new Map() } }), 'INVALID_OPTIONS');
    expectErrorCode(() => canonicaliseConfiguration({ ...EXAMPLE(), options: { a: undefined } }), 'INVALID_OPTIONS');
    expectErrorCode(() => canonicaliseConfiguration({ ...EXAMPLE(), options: { a: Number.NaN } }), 'INVALID_OPTIONS');
    expectErrorCode(() => canonicaliseConfiguration({ ...EXAMPLE(), sideStones: [() => 1] }), 'INVALID_SIDE_STONES');
    expectErrorCode(() => canonicaliseConfiguration({ ...EXAMPLE(), options: { a: 10n } }), 'INVALID_OPTIONS');
  });

  it('rejects a non-object options value (INVALID_OPTIONS)', () => {
    expectErrorCode(
      () => canonicaliseConfiguration({ ...EXAMPLE(), options: ['a'] as never }),
      'INVALID_OPTIONS',
    );
  });

  it('rejects a wrong engraving text type (INVALID_ENGRAVING_TEXT)', () => {
    expectErrorCode(
      () => canonicaliseConfiguration({ ...EXAMPLE(), engravingText: 42 as never }),
      'INVALID_ENGRAVING_TEXT',
    );
  });

  it('rejects out-of-range, non-integer and unbounded hash versions (INVALID_HASH_VERSION)', () => {
    expectErrorCode(() => canonicaliseConfiguration({ ...EXAMPLE(), hashVersion: 0 }), 'INVALID_HASH_VERSION');
    expectErrorCode(() => canonicaliseConfiguration({ ...EXAMPLE(), hashVersion: 32768 }), 'INVALID_HASH_VERSION');
    expectErrorCode(() => canonicaliseConfiguration({ ...EXAMPLE(), hashVersion: 1.5 }), 'INVALID_HASH_VERSION');
  });
});
