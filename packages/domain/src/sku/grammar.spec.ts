import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors.js';
import { parseMetalCode } from '../enums.js';
import { parseDerivedSku } from '../value-objects/derived-sku.js';
import { parseSourceSku } from '../value-objects/source-sku.js';
import { parseGemRef } from '../value-objects/gem-ref.js';
import {
  composeSku,
  parseSkuFromSlug,
  parseSkuOrThrow,
  parseSkuString,
  SKU_GRAMMAR_VERSION,
  type ParsedSku,
} from './grammar.js';

type SettingParse = Extract<ParsedSku, { family: 'SETTING' }>;
type ConfiguredParse = Extract<ParsedSku, { family: 'CONFIGURED' }>;

function mustBeSetting(parsed: ParsedSku | null): SettingParse {
  if (parsed === null || parsed.family !== 'SETTING') throw new Error(`expected a SETTING parse, got ${JSON.stringify(parsed)}`);
  return parsed;
}

function mustBeConfigured(parsed: ParsedSku | null): ConfiguredParse {
  if (parsed === null || parsed.family !== 'CONFIGURED') throw new Error(`expected a CONFIGURED parse, got ${JSON.stringify(parsed)}`);
  return parsed;
}

describe('SKU grammar — valid forms (SoT 1.1; doc 10)', () => {
  it('setting-only SKU: JS<core><metal>, no gemRef', () => {
    const parsed = mustBeSetting(parseSkuString('JS1150W10'));
    expect(parsed.sku).toEqual({ settingCore: '1150', metalCode: 'W10' });
    expect(parsed.sku.gemRef).toBeUndefined();
  });

  it('configured SKU with a single stone (K -> SINGLE)', () => {
    const parsed = mustBeConfigured(parseSkuString('JS1150W14-K1324'));
    expect(parsed.sku).toEqual({ settingCore: '1150', metalCode: 'W14', gemRef: 'K1324' });
    expect(parsed.gemstone).toEqual({ gemRef: 'K1324', kind: 'SINGLE' });
  });

  it('configured SKU with a matched pair (PR -> PAIR)', () => {
    const parsed = mustBeConfigured(parseSkuString('JS1383R14-PR5681'));
    expect(parsed.sku.gemRef).toBe('PR5681');
    expect(parsed.gemstone.kind).toBe('PAIR');
  });

  it('accepts every metal-code enum member, including R10 which the evidence never observes', () => {
    for (const metal of ['W10', 'Y10', 'R10', 'W14', 'Y14', 'R14', 'W18', 'Y18', 'R18', 'PT', 'SL', 'YW14', 'YW18', 'WY14', 'WY18'] as const) {
      const parsed = mustBeSetting(parseSkuString(`JS123${metal}`));
      expect(parsed.sku.metalCode, metal).toBe(metal);
    }
    // R10 is enum-valid even though the observed DYO corpus never uses it
    expect(mustBeConfigured(parseSkuString('JS123R10-K7')).sku.metalCode).toBe('R10');
  });

  it('accepts multi-digit and single-digit gemstone references', () => {
    expect(mustBeConfigured(parseSkuString('JS1427Y18-K32255')).gemstone.gemRef).toBe('K32255');
    expect(mustBeConfigured(parseSkuString('JS1138W18-PR14703')).gemstone.kind).toBe('PAIR');
    expect(mustBeConfigured(parseSkuString('JS123R10-K7')).gemstone.gemRef).toBe('K7');
  });

  it('ready-made SKU: J<digits>', () => {
    expect(parseSkuString('J10347')).toEqual({ family: 'READY_MADE', readyMadeNumber: '10347' });
    expect(parseSkuString('J11402')?.family).toBe('READY_MADE');
  });

  it('two-letter metal families parse unambiguously (WY/YW do not collide with W/Y codes)', () => {
    expect(mustBeSetting(parseSkuString('JS1150WY14')).sku.metalCode).toBe('WY14');
    expect(mustBeSetting(parseSkuString('JS1150YW14')).sku.metalCode).toBe('YW14');
    expect(mustBeSetting(parseSkuString('JS1150WY18')).sku.metalCode).toBe('WY18');
    expect(mustBeSetting(parseSkuString('JS1150YW18')).sku.metalCode).toBe('YW18');
    expect(mustBeSetting(parseSkuString('JS1169SL')).sku.metalCode).toBe('SL');
    expect(mustBeSetting(parseSkuString('JS1169PT')).sku.metalCode).toBe('PT');
  });

  it('canonical output is frozen/immutable', () => {
    const parsed = mustBeConfigured(parseSkuString('JS1383R14-PR5681'));
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.sku)).toBe(true);
    expect(Object.isFrozen(parsed.gemstone)).toBe(true);
  });
});

describe('SKU grammar — derivations and composition (doc 05 SkuGrammar)', () => {
  it('Example B: trailing token of a DYO review slug parses to the same structure as the observed SKU', () => {
    const slug = 'blue-aquamarine-earrings-emerald-cut-5.98ct-14k-rose-gold-js1383r14-pr5681';
    const fromSlug = parseSkuFromSlug(slug);
    expect(fromSlug).toEqual(parseSkuString('JS1383R14-PR5681'));
    expect(fromSlug?.family).toBe('CONFIGURED');
  });

  it('slug derivation is case-normalising: lowercase slug text yields the uppercase canonical composition', () => {
    expect(mustBeConfigured(parseSkuFromSlug('review-js1150w14-k1324')).sku).toEqual({
      settingCore: '1150',
      metalCode: 'W14',
      gemRef: 'K1324',
    });
  });

  it('non-SKU slugs yield null (an expected classification outcome, not an error)', () => {
    expect(parseSkuFromSlug('tsavorite-garnet')).toBeNull();
    expect(parseSkuFromSlug('design-your-own/review/blue-aquamarine-earrings-emerald-cut-5.98ct-14k-rose-gold')).toBeNull();
    expect(parseSkuFromSlug('')).toBeNull();
  });

  it('composeSku is the inverse of parse for the setting forms (doc 05: inverse of parse)', () => {
    expect(composeSku({ settingCore: '1150', metalCode: parseMetalCode('W14') })).toBe('JS1150W14');
    expect(composeSku({ settingCore: '1150', metalCode: parseMetalCode('W14'), gemRef: parseGemRef('K1324') })).toBe('JS1150W14-K1324');
  });

  it('round-trip: compose(parse(x)) === x for canonical input', () => {
    for (const value of ['JS1016W10', 'JS1427Y18-K32255', 'JS1169SL', 'JS1383R14-PR5681']) {
      const parsed = parseSkuString(value);
      if (parsed === null || parsed.family === 'READY_MADE') continue;
      const gemRef = parsed.sku.gemRef;
      expect(composeSku({
        settingCore: parsed.sku.settingCore,
        metalCode: parsed.sku.metalCode,
        ...(gemRef !== undefined ? { gemRef } : {}),
      })).toBe(value);
    }
  });

  it('parses are deterministic: identical input, identical result', () => {
    expect(parseSkuString('JS1383R14-PR5681')).toEqual(parseSkuString('JS1383R14-PR5681'));
    const slug = 'blue-aquamarine-earrings-emerald-cut-5.98ct-14k-rose-gold-js1383r14-pr5681';
    expect(parseSkuFromSlug(slug)).toEqual(parseSkuFromSlug(slug));
  });

  it('parse does not mutate its input', () => {
    const input = 'JS1383R14-PR5681';
    const before = input;
    parseSkuString(input);
    parseSkuFromSlug(input);
    expect(input).toBe(before);
  });

  it('exposes the recorded grammar version for DerivedSku provenance', () => {
    expect(SKU_GRAMMAR_VERSION).toBe('1');
  });

  it('observed and derived identities keep their provenance split (Task 6 union; §6 source/observation rule)', () => {
    const observed = parseSourceSku('JS1383R14-PR5681');
    // The derived value is the canonical composition of the slug parse — the
    // raw slug text is never stored as a SKU (Task 6 requires uppercase
    // normalisation; the canonicalisation IS the validated Example B behavior).
    const derived = parseDerivedSku('JS1383R14-PR5681', {
      method: 'URL_SLUG',
      parserVersion: SKU_GRAMMAR_VERSION,
      confidence: 1,
    });
    expect(observed).toBe('JS1383R14-PR5681');
    expect(derived.sku).toBe('JS1383R14-PR5681');
    expect(derived.provenance).toEqual({ method: 'URL_SLUG', parserVersion: '1', confidence: 1 });
  });
});

describe('SKU grammar — malformed inputs rejected deterministically', () => {
  const INVALID: string[] = [
    '',                        // empty input
    '   ',                     // whitespace only
    ' JS1150W10',              // leading space
    'JS1150W10 ',              // trailing space
    'js1150w14',               // lowercase / non-canonical for a SKU string
    'Js1150W14',               // mixed case
    'K1324',                   // a gem ref alone is not a SKU
    'PR5681',                  // a pair ref alone is not a SKU
    'XS1150W10',               // malformed prefix
    'JX1150W10',               // malformed prefix
    'JSX1150',                 // no digits after JS
    'JSW14',                   // missing design core
    'JS',                      // empty everything
    'J',                       // empty ready-made
    'JS1150',                  // missing metal code
    'JS1150W1',                // truncated metal code
    'JS1150Q14',               // invalid metal code
    'JS1150WW14',              // invalid metal code
    'JS1150W14K1324',          // missing '-' separator
    'JS1150W14-K',             // malformed gem ref (no digits)
    'JS1150W14-K1x2',          // malformed gem ref
    'JS1150W14-PR',            // malformed pair ref (no digits)
    'JS1150W14-XY123',         // malformed gem ref prefix
    'JS1150W10-X',             // unexpected suffix
    'JS1150W10-K1324-X',       // unexpected trailing segment
    'J10347X',                 // ready-made with suffix
    'JS10347',                 // J + S...: neither ready-made nor setting
  ];

  it('parseSkuString yields null for every malformed form', () => {
    for (const value of INVALID) {
      expect({ value, parsed: parseSkuString(value) }).toEqual({ value, parsed: null });
    }
  });

  it('parseSkuOrThrow raises DomainError(INVALID_SKU) with a deterministic reason', () => {
    for (const value of INVALID) {
      let error: unknown;
      try {
        parseSkuOrThrow(value);
      } catch (e) {
        error = e;
      }
      expect(error, value).toBeInstanceOf(DomainError);
      expect((error as DomainError).code, value).toBe('INVALID_SKU');
    }
  });

  it('the OrThrow path succeeds exactly where the null path succeeds', () => {
    for (const value of ['JS1150W10', 'JS1383R14-PR5681', 'J10347']) {
      expect(parseSkuOrThrow(value)).toEqual(parseSkuString(value));
    }
    // and throws exactly where null is returned (lowercase is non-canonical for a SKU string)
    expect(() => parseSkuOrThrow('js1150w14')).toThrowError(DomainError);
  });
});
