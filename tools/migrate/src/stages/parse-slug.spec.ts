/**
 * Phase 2 Global Task 12 — parser unit gates (plan detailed tasks 4+5).
 *
 * Fixtures are REAL corpus URLs (the shapes the reverse-engineering
 * validated); every family is proven, malformed/misfiled URLs land in
 * UNKNOWN with explicit warnings, the field-level evidence ledger is
 * complete, repeated parsing is byte-identical, and the REAL census
 * reconciles the SoT §4.2 commerce counts exactly (V14; skips when the
 * archive is absent).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import { URL_FAMILIES, buildOriginVocabulary, classifyUrl } from './parse-slug.js';
import { EXPECTED_FAMILY_COUNTS, EXPECTED_ENTITY_COUNTS } from './parse-slugs.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../..');
/** Detect the archive root (see reference-corpus.spec.ts): the sanctioned
 * layout is `<root>/naturalgemstones`; restored environments may nest it. */
function detectArchiveRoot(): string {
  const override = process.env['NATURALGEMSTONES_ROOT'];
  if (override) return override;
  const shallow = path.join(REPO_ROOT, 'naturalgemstones');
  if (existsSync(path.join(shallow, 'reverse_engineered'))) return shallow;
  const nested = path.join(shallow, 'naturalgemstones');
  if (existsSync(path.join(nested, 'reverse_engineered'))) return nested;
  return shallow;
}
const realUrlsPath = path.join(detectArchiveRoot(), 'reverse_engineered', 'data', 'urls.jsonl');
const realArchiveReady = existsSync(realUrlsPath);

const FIXTURE_URLS = {
  loose: 'https://naturalgemstones.com/spinel/0.25ct-ceylon-sri-lankan-round-purple-spinel-k23025',
  looseNoColour: 'https://naturalgemstones.com/alexandrite/0.16ct-russian-oval-alexandrite-k15019',
  pair: 'https://naturalgemstones.com/citrine-pairs/0.57ct-brazilian-fancy-citrine-pair-pr15001',
  settingRing: 'https://naturalgemstones.com/gemstone-ring-settings/10k-white-gold-accent-stones-ring-setting-js1016w10',
  settingNecklacePendant: 'https://naturalgemstones.com/gemstone-necklace-pendant-settings/10k-white-gold-accent-stones-necklace-setting-js1390w10',
  settingEarring: 'https://naturalgemstones.com/gemstone-earring-settings/14k-rose-gold-accent-stones-earring-setting-js1132r14',
  dyo: 'https://naturalgemstones.com/design-your-own/review/blue-aquamarine-earrings-emerald-cut-5.98ct-14k-rose-gold-js1383r14-pr5681',
  dyoNoColour: 'https://naturalgemstones.com/design-your-own/review/alexandrite-necklace-cushion-0.47ct-10k-white-gold-js1247w10-k13124',
  readyMade: 'https://naturalgemstones.com/alexandrite-rings/alexandrite-halo-ring-cushion-0.00ct-14k-yellow-gold-j10763',
  varietyIndex: 'https://naturalgemstones.com/agate',
  categoryIndex: 'https://naturalgemstones.com/agate-pairs',
  colourCategory: 'https://naturalgemstones.com/blue-gemstones',
  allIndex: 'https://naturalgemstones.com/all-natural-gemstones',
  functional: 'https://naturalgemstones.com/cart',
  sitemap: 'https://naturalgemstones.com/sitemap-products-7.xml',
  misfiledJewellery: 'https://naturalgemstones.com/gemstone-necklaces-pendants/gemstone-accent-stones-bracelet-oval-11.26ct-14k-white-gold-j10208',
  nonKRef: 'https://naturalgemstones.com/garnet/3.16ct-tanzanian-emerald-cut-purplish-pink-garnet-s42254',
} as const;

const UNIT_VOCAB = buildOriginVocabulary([
  // Real corpus slugs whose origin phrase is anchored by an exact shape token:
  'https://naturalgemstones.com/citrine/0.36ct-brazilian-oval-yellowish-orange-citrine-k19637',
  'https://naturalgemstones.com/spinel/0.25ct-ceylon-sri-lankan-round-purple-spinel-k23025',
  'https://naturalgemstones.com/zircon/0.33ct-malawian-trillion-blue-zircon-k10379',
  'https://naturalgemstones.com/kunzite/1.78ct-afghan-cushion-pink-kunzite-k19234',
  'https://naturalgemstones.com/coral/0.13ct-italian-marquise-salmon-orangish-red-coral-k15573',
  'https://naturalgemstones.com/moonstone/0.22ct-ceylon-sri-lankan-emerald-cut-rainbow-moonstone-k4129',
  'https://naturalgemstones.com/white-opal-light-opal/0.34ct-australian-pear-multi-color-white-opal-light-opal-k22312',
  ...Object.values(FIXTURE_URLS).map((u) => String(u)),
]);

describe('url family classification (the five documented shapes)', () => {
  const C = (url: keyof typeof FIXTURE_URLS): ReturnType<typeof classifyUrl> => classifyUrl(FIXTURE_URLS[url], UNIT_VOCAB);

  it('classifies the loose-stone family with anchored weight, ref and variety', () => {
    const p = C('loose');
    expect(p.family).toBe('LOOSE_STONE');
    expect(p.fields.gemRefDerived?.value).toBe('K23025');
    expect(p.fields.stoneWeightCt?.value).toBe(0.25);
    expect(p.fields.shape?.value).toBe('ROUND');
    expect(p.fields.form).toBe('single');
    expect(p.fields.variety?.value).toBe('spinel');
    expect(p.fields.origin?.value).toBe('ceylon-sri-lankan');
    expect(p.fields.colour?.value).toBe('purple');
  });

  it('classifies the pair family with the pair anchor and a PR ref', () => {
    const p = C('pair');
    expect(p.family).toBe('STONE_PAIR');
    expect(p.fields.gemRefDerived?.value).toBe('PR15001');
    expect(p.fields.form).toBe('pairs');
    expect(p.fields.origin?.value).toBe('brazilian');
  });

  it('classifies the three documented settings route families', () => {
    expect(C('settingRing').family).toBe('SETTING');
    expect(C('settingNecklacePendant').family).toBe('SETTING');
    expect(C('settingEarring').family).toBe('SETTING');
  });

  it('derives the design code and metal code from the validated grammar', () => {
    const p = C('settingRing');
    expect(p.fields.designCode?.value).toBe('JS1016W10');
    expect(p.fields.metalCode?.value).toBe('W10');
    expect(p.fields.derivedSku?.value).toBe('JS1016W10');
    expect(p.fields.jewelleryType?.value).toBe('RING');
  });

  it('keeps the necklace-pendant mount family on the recorded jewellery decision', () => {
    const p = C('settingNecklacePendant');
    expect(p.fields.jewelleryType?.value).toBe('PENDANT');
  });

  it('classifies DYO review slugs with the CONFIGURED-derived SKU and gem ref', () => {
    const p = C('dyo');
    expect(p.family).toBe('DYO');
    expect(p.fields.derivedSku?.value).toBe('JS1383R14');
    expect(p.fields.gemRefDerived?.value).toBe('PR5681');
    expect(p.fields.metalCode?.value).toBe('R14');
    expect(p.fields.jewelleryType?.value).toBe('EARRINGS');
    expect(p.fields.shape?.value).toBe('EMERALD_CUT');
    expect(p.fields.stoneWeightCt?.value).toBe(5.98);
  });

  it('classifies DYO slugs without a colour token', () => {
    const p = C('dyoNoColour');
    expect(p.family).toBe('DYO');
    expect(p.fields.gemRefDerived?.value).toBe('K13124');
    expect(p.fields.jewelleryType?.value).toBe('NECKLACE');
    expect(p.fields.shape?.value).toBe('CUSHION');
    expect(p.fields.metalCode?.value).toBe('W10');
  });

  it('classifies the canonical ready-made family with a J ref', () => {
    const p = C('readyMade');
    expect(p.family).toBe('READY_MADE');
    expect(p.fields.gemRefDerived?.value).toBe('J10763');
    expect(p.fields.variety?.value).toBe('alexandrite');
    expect(p.fields.stoneWeightCt?.value).toBe(0);
  });
});

describe('non-commerce and unknown families', () => {
  it('classifies index routes', () => {
    expect(classifyUrl(FIXTURE_URLS.varietyIndex).family).toBe('VARIETY_INDEX');
    expect(classifyUrl(FIXTURE_URLS.categoryIndex).family).toBe('CATEGORY_INDEX');
    expect(classifyUrl(FIXTURE_URLS.colourCategory).family).toBe('CATEGORY_INDEX');
    expect(classifyUrl(FIXTURE_URLS.allIndex).family).toBe('CATEGORY_INDEX');
  });

  it('classifies functional and sitemap routes', () => {
    expect(classifyUrl(FIXTURE_URLS.functional).family).toBe('FUNCTIONAL');
    expect(classifyUrl(FIXTURE_URLS.sitemap).family).toBe('FUNCTIONAL');
    expect(classifyUrl(FIXTURE_URLS.sitemap).warnings.join(' ')).toContain('sitemap');
  });

  it('misfiled jewellery slugs stay EXPLICITLY unknown — never silently classified', () => {
    const p = classifyUrl(FIXTURE_URLS.misfiledJewellery);
    expect(p.family).toBe('UNKNOWN');
    expect(p.warnings.join(' ')).toContain('misfiled');
  });

  it('a slug with a non-K/PR/J ref stays UNKNOWN with an explicit warning', () => {
    const p = classifyUrl(FIXTURE_URLS.nonKRef);
    expect(p.family).toBe('UNKNOWN');
    expect(p.fields.gemRefDerived?.value ?? null).toBeNull();
    expect(p.warnings.join(' ')).toContain('misfiled');
  });

  it('the url_family enumeration is exactly the schema comment set', () => {
    expect([...URL_FAMILIES]).toEqual([
      'LOOSE_STONE',
      'STONE_PAIR',
      'SETTING',
      'DYO',
      'READY_MADE',
      'VARIETY_INDEX',
      'CATEGORY_INDEX',
      'FUNCTIONAL',
      'EDUCATION',
      'UNKNOWN',
    ]);
  });
});

describe('per-field evidence ledger', () => {
  it('anchored fields are EXTRACTED at 1.0 and missing fields are null+UNKNOWN', () => {
    const p = classifyUrl(FIXTURE_URLS.loose);
    expect(p.fields.stoneWeightCt?.evidence).toBe('EXTRACTED');
    expect(p.fields.stoneWeightCt?.confidence).toBe(1);
    expect(p.fields.jewelleryType).toBeNull();
    expect(p.fields.cut).toBeNull();
    expect(p.confidence).toBeGreaterThan(0.5);
  });

  it('repeated parsing is byte-identical (determinism)', () => {
    const a = classifyUrl(FIXTURE_URLS.dyo);
    const b = classifyUrl(FIXTURE_URLS.dyo);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('REAL corpus census (gate V14)', () => {
  it.skipIf(!realArchiveReady)('every family count reconciles the SoT §4.2 commerce totals exactly', () => {
    const lines = readFileSync(realUrlsPath, 'utf8').split('\n').filter((l) => l.trim().length > 0);
    expect(lines).toHaveLength(44_218);
    const paths = lines.map((l) => String((JSON.parse(l) as { url: string }).url));
    const originVocabulary = buildOriginVocabulary(paths);
    const census: Record<string, number> = Object.fromEntries(URL_FAMILIES.map((f) => [f, 0]));
    const looseRefs = new Set<string>();
    for (const url of paths) {
      const p = classifyUrl(url, originVocabulary);
      census[p.family] = (census[p.family] ?? 0) + 1;
      if (p.family === 'LOOSE_STONE' && p.fields.gemRefDerived?.value !== null) looseRefs.add(String(p.fields.gemRefDerived?.value));
    }
    const total = Object.values(census).reduce((a, b) => a + b, 0);
    expect(total).toBe(44_218);
    // Verified commerce subtotals:
    expect(census['LOOSE_STONE']).toBe(EXPECTED_FAMILY_COUNTS.LOOSE_STONE);
    expect(census['STONE_PAIR']).toBe(EXPECTED_FAMILY_COUNTS.STONE_PAIR);
    expect(census['SETTING']).toBe(EXPECTED_FAMILY_COUNTS.SETTING); // the measured corpus holds every /gemstone-*-settings route in the SETTING family
    expect(census['DYO']).toBe(EXPECTED_FAMILY_COUNTS.DYO);
    expect(census['READY_MADE']).toBe(EXPECTED_FAMILY_COUNTS.READY_MADE);
    expect(looseRefs.size).toBe(EXPECTED_ENTITY_COUNTS.LOOSE_STONE_REFS);
  });
});
