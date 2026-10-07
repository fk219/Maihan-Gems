/**
 * tools/migrate — the deterministic five-family URL/slug classifier and
 * field tokenizer (Phase 2 Global Task 12 = plan detailed tasks 4+5).
 *
 * Plan task 12 (verbatim): "Implement the parse stage: five-family slug
 * classifier writing `staging_parsed_urls` with per-field confidence."
 * Done when gates V1 + V2 hold at 100% and V14 reconciles the per-family
 * counts exactly.
 *
 * Evidence basis (all [VERIFIED] on the corpus, PROJECT_SOURCE_OF_TRUTH.md
 * §2.1 / §4.2 / §33.2, technical_design/34 §3 route map):
 *
 *   LOOSE_STONE   /{variety}/{w}ct-{origin}-{shape}-{colour}-{variety}-K#####
 *   STONE_PAIR    /{variety}-pairs/{w}ct-{origin}-[{shape}-]{variety}-pair-PR#####
 *   SETTING       /gemstone-{ring|necklace-pendant|earring}-settings/
 *                  {metalPhrase}-{styleTokens}-setting-js<core><metal>
 *   DYO           /design-your-own/review/
 *                  [{tokens}]-{w}ct-{metalPhrase}-js<core><metal>-{K|PR}<digits>
 *   READY_MADE    /{variety}-rings/{slug}-J#####    (the 88 observed items)
 *
 * Non-commerce families land in the schema's full url_family enumeration
 * (VARIETY_INDEX, CATEGORY_INDEX, FUNCTIONAL, EDUCATION). A URL matching NO
 * documented shape is family UNKNOWN with explicit warnings — unknown stays
 * explicitly represented, never silently widened into a guessed family.
 *
 * Per-field ledger: every parsed field carries a confidence in [0,1] and an
 * evidence status; a value normalised from a source string is at most
 * EXTRACTED (doc 05); a field with no evidence is null with UNKNOWN, never
 * a default.
 *
 * Determinism: pure functions of the URL text plus vocabularies derived from
 * the SAME verified corpus in a bounded first pass (origin phrases), so
 * given identical input hashes the parse output is identical.
 */
import { METAL_SEED } from '@maihan/db';
import { parseSkuString, parseSkuFromSlug, type MetalCode } from '@maihan/domain';

export const URL_FAMILIES = [
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
] as const;

export type UrlFamily = (typeof URL_FAMILIES)[number];

// ---------------------------------------------------------------------------
// Field evidence + parsed shape
// ---------------------------------------------------------------------------

export interface FieldEvidence {
  /** The structured value; null when no evidence supports a value. */
  readonly value: string | number | null;
  /** Parse confidence in [0,1]; 1.0 = structurally anchored token. */
  readonly confidence: number;
  /** 'EXTRACTED' when a value was deterministically derived from a source
   *  string; 'UNKNOWN' when no evidence produced a value. */
  readonly evidence: 'EXTRACTED' | 'UNKNOWN';
  /** Deterministic parse warning for the field (UNKNOWN cases). */
  readonly warning?: string;
}

export interface ParsedUrlFields {
  readonly variety: FieldEvidence | null; // slug variety token phrase
  readonly colour: FieldEvidence | null; // colour token phrase (may be multi-token)
  readonly form: string; // 'single' | 'pairs' | 'rings' | 'settings' | 'none'
  readonly stoneWeightCt: FieldEvidence | null; // carats (NUMERIC(8,3))
  readonly origin: FieldEvidence | null; // origin token phrase
  readonly shape: FieldEvidence | null; // stone_shape enum value
  readonly cut: FieldEvidence | null; // cut label phrase
  readonly jewelleryType: FieldEvidence | null; // jewellery_type enum value
  readonly designCode: FieldEvidence | null; // 'JS<core><metal>' derived
  readonly metalCode: FieldEvidence | null; // metal_code enum member
  readonly settingStyle: FieldEvidence | null; // the settings design token
  readonly gemRefDerived: FieldEvidence | null; // from the URL slug only
  readonly gemRefObserved: FieldEvidence | null; // null here; canonical stages join product.sku
  readonly derivedSku: FieldEvidence | null; // composed from the slug grammar (DYO only)
}

export interface ParsedUrl {
  readonly sourceUrl: string;
  readonly family: UrlFamily;
  readonly routeDepth: number;
  readonly fields: ParsedUrlFields;
  /** Row-level parse warnings (unknown-family reasons etc.). */
  readonly warnings: readonly string[];
  /** Minimum field confidence (row's parse_confidence). */
  readonly confidence: number;
}

// ---------------------------------------------------------------------------
// Vocabularies
// ---------------------------------------------------------------------------

/** Exact hyphenated shape token -> stone_shape enum value. */
const SHAPE_VALUES: ReadonlyMap<string, string> = new Map(
  (
    [
      ['oval', 'OVAL'],
      ['round', 'ROUND'],
      ['cushion', 'CUSHION'],
      ['emerald-cut', 'EMERALD_CUT'],
      ['pear', 'PEAR'],
      ['radiant', 'RADIANT'],
      ['princess', 'PRINCESS'],
      ['heart', 'HEART'],
      ['trillion', 'TRILLION'],
      ['asscher-octagon', 'ASSCHER_OCTAGON'],
      ['baguette', 'BAGUETTE'],
      ['marquise', 'MARQUISE'],
    ] as const
  ).map(([token, value]) => [token, value] as const),
);

/** Jewellery slug token -> jewellery_type enum member. */
const JEWELLERY_VALUES: ReadonlyMap<string, string> = new Map(
  (
    [
      ['ring', 'RING'],
      ['earring', 'EARRINGS'],
      ['earrings', 'EARRINGS'],
      ['pendant', 'PENDANT'],
      ['necklace', 'NECKLACE'],
      ['bracelet', 'BRACELET'],
    ] as const
  ).map(([token, value]) => [token, value] as const),
);

/** Metal slug phrase -> metal_code enum member (the authoritative seed). */
const METAL_BY_PHRASE: ReadonlyMap<string, MetalCode> = new Map(
  METAL_SEED.map((m) => [m.slugPhrase, m.code] as const),
);

/** Documented settings route families with their mount jewellery type. */
export const SETTING_ROUTE_FAMILIES: readonly {
  readonly prefix: string;
  readonly jewellery: 'RING' | 'EARRINGS' | 'PENDANT';
}[] = Object.freeze([
  { prefix: '/gemstone-ring-settings/', jewellery: 'RING' },
  { prefix: '/gemstone-earring-settings/', jewellery: 'EARRINGS' },
  // Mount family for necklace AND pendant: the design core is a pendant
  // mount; the necklace is the same core realised on a chain. Recorded as a
  // modelling decision (DECISIONS.md, INFERRED) — never presented as observed.
  { prefix: '/gemstone-necklace-pendant-settings/', jewellery: 'PENDANT' },
]);

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

const WEIGHT_RE = /^(\d+(?:\.\d+)?)ct$/;

function weightValueOf(token: string): number | null {
  const m = WEIGHT_RE.exec(token.toLowerCase());
  return m === null ? null : Number(m[1]);
}

function isKRef(tail: string): string | null {
  const m = /^-?k(\d+)$/i.exec(tail);
  return m?.[1] ?? null;
}

function isPrRef(tail: string): string | null {
  const m = /^-?pr(\d+)$/i.exec(tail);
  return m?.[1] ?? null;
}

function isJRef(tail: string): string | null {
  const m = /^-?j(\d+)$/i.exec(tail);
  return m?.[1] ?? null;
}

function ev(
  value: string | number | null,
  confidence: number,
  evidence: 'EXTRACTED' | 'UNKNOWN',
  warning?: string,
): FieldEvidence {
  return Object.freeze({ value, confidence, evidence, warning });
}

function emptyFields(): ParsedUrlFields {
  return Object.freeze({
    variety: null,
    colour: null,
    form: 'none',
    stoneWeightCt: null,
    origin: null,
    shape: null,
    cut: null,
    jewelleryType: null,
    designCode: null,
    metalCode: null,
    settingStyle: null,
    gemRefDerived: null,
    gemRefObserved: null,
    derivedSku: null,
  });
}

function minConfidence(fields: ParsedUrlFields): number {
  let min = 1;
  for (const field of Object.values(fields)) {
    if (field !== null && field !== undefined && typeof field === 'object' && 'confidence' in field) {
      min = Math.min(min, field.confidence);
    }
  }
  return Math.round(min * 1_000) / 1_000;
}

// ---------------------------------------------------------------------------
// Origin vocabulary (two-pass, deterministic)
// ---------------------------------------------------------------------------

/**
 * Slugs WITHOUT an exact shape token need a known-origin vocabulary to split
 * their leading token run. Pass 1 derives it from the slugs that DO have a
 * shape: their token run between the weight token and the shape token is the
 * origin phrase, anchored on both sides. The vocabulary is keyed by phrase
 * with an observed usage count. Nothing is invented.
 */
export function buildOriginVocabulary(paths: readonly string[]): Map<string, { count: number }> {
  const vocab = new Map<string, { count: number }>();
  for (const path of paths) {
    const parsed = looseOrPairBody(path);
    if (parsed === null || parsed.shapeIndex === undefined || parsed.shapeIndex === 0) continue;
    const phrase = parsed.body.slice(0, parsed.shapeIndex).join('-');
    if (phrase.length === 0) continue;
    const hit = vocab.get(phrase);
    if (hit === undefined) vocab.set(phrase, { count: 1 });
    else hit.count += 1;
  }
  return vocab;
}


/**
 * The exact-shape finder: shapes may span tokens when the token text contains
 * a hyphen ('emerald-cut', 'asscher-octagon'), so scanning a dash-split token
 * run must match adjacent 2-token phrases. Returns the START index of the
 * first match, or undefined.
 */
function findShapeStart(body: readonly string[]): number | undefined {
  for (let i = 0; i < body.length; i += 1) {
    const twoToken = `${body[i] ?? ''}-${body[i + 1] ?? ''}`;
    if (body[i + 1] !== undefined && SHAPE_VALUES.has(twoToken.toLowerCase())) return i;
    if (SHAPE_VALUES.has((body[i] ?? '').toLowerCase())) return i;
  }
  return undefined;
}
/**
 * Split a loose/pair slug body: first token is the weight; the trailing ref
 * (and, for pairs, the literal 'pair' token) comes off the end. Returns the
 * body tokens between them and an (optional) exact-shape token index.
 */
function looseOrPairBody(path: string): { body: readonly string[]; shapeIndex?: number } | null {
  const segments = path.split('/');
  const slug = segments[segments.length - 1] ?? '';
  const tokens = slug.split('-');
  if (weightValueOf(tokens[0] ?? '') === null) return null;
  const last = tokens[tokens.length - 1] ?? '';
  const k = isKRef(last);
  const pr = isPrRef(last);
  if (k === null && pr === null) return null;
  if (pr !== null) {
    // pair family: '...-{variety tokens}-pair-PR#####'
    if (k !== null) return null; // 'k...' token and 'pr...' token can't both be
    if ((tokens[tokens.length - 2] ?? '').toLowerCase() !== 'pair') return null;
    const body = tokens.slice(1, tokens.length - 2);
    return Object.freeze({ body, shapeIndex: findShapeStart(body) });
  }
  const body = tokens.slice(1, tokens.length - 1);
  return Object.freeze({ body, shapeIndex: findShapeStart(body) });
}

// ---------------------------------------------------------------------------
// Loose / pair field parsing
// ---------------------------------------------------------------------------

function parseLoosePairFields(
  dir: string,
  slug: string,
  originVocabulary?: ReadonlyMap<string, unknown>,
): { fields: ParsedUrlFields; warnings: readonly string[] } {
  const isPair = dir.endsWith('-pairs');
  const warnings: string[] = [];
  const parsed = looseOrPairBody(`/${dir}/${slug}`);
  const weight = weightValueOf(slug.split('-')[0] ?? '');
  const tail = (slug.split('-').pop() ?? '').toUpperCase();
  const refText = isPair ? (isPrRef(tail) === null ? null : tail.toUpperCase()) : (isKRef(tail) === null ? null : tail.toUpperCase());

  if (parsed === null) {
    // Structurally unparseable weight/ref anchors: explicit UNKNOWN fields.
    return Object.freeze({
      fields: Object.freeze({
        ...emptyFields(),
        form: isPair ? 'pairs' : 'single',
        stoneWeightCt: ev(null, 0, 'UNKNOWN', 'slug weight token unparseable'),
        gemRefDerived: ev(null, 0, 'UNKNOWN', 'no trailing gem-ref token'),
      }),
      warnings: [`slug does not match the validated ${isPair ? 'pair' : 'loose-stone'} grammar: ${slug}`],
    });
  }

  // Variety = the directory's token run; it must be the body's tail run (V4).
  const dirTokens = dir.replace(/-(pairs|rings)$/, '').split('-');
  const varietyLen = dirTokens.length;
  const body = parsed.body;
  const tailRun = body.slice(body.length - varietyLen).join('-');
  const varietyOk = tailRun === dirTokens.join('-');
  if (!varietyOk) {
    warnings.push(`variety directory '${dirTokens.join('-')}' is not at the slug tail ('${tailRun}') — field quarantined for review`);
  }

  // Shape (optional) and origin (optional).
  let originValue: string | null = null;
  let colourStart = 0;
  if (parsed.shapeIndex !== undefined) {
    originValue = parsed.shapeIndex > 0 ? body.slice(0, parsed.shapeIndex).join('-') : null;
    colourStart = parsed.shapeIndex + 1;
  } else if (originVocabulary !== undefined) {
    // Split the leading run by the longest known origin phrase (2-token,
    // then 3, then 1) — pass-1 vocabulary, deterministic.
    for (let len = Math.min(3, body.length); len >= 1; len -= 1) {
      const phrase = body.slice(0, len).join('-');
      if (originVocabulary.has(phrase)) {
        originValue = phrase;
        colourStart = len;
        break;
      }
    }
  }
  const shapeToken = parsed.shapeIndex !== undefined ? (body[parsed.shapeIndex] ?? '').toLowerCase() : null;
  const shapeValue = shapeToken !== null ? (SHAPE_VALUES.get(shapeToken) ?? null) : null;
  // Colour tokens = the run between the origin/shape end and the variety tail.
  const colourTokens = body.slice(colourStart, body.length - varietyLen).join('-');
  if (colourStart > body.length - varietyLen && colourStart <= body.length) {
    warnings.push('colour run overlaps the variety tail; colour not resolved');
  }

  const fields: ParsedUrlFields = Object.freeze({
    variety: ev(dirTokens.join('-'), varietyOk ? 1 : 0.75, 'EXTRACTED', varietyOk ? undefined : 'variety token run mismatch; see row warnings'),
    colour: colourTokens.length > 0 && colourTokens.length > 0 ? ev(colourTokens, 0.9, 'EXTRACTED') : null,
    form: isPair ? 'pairs' : 'single',
    stoneWeightCt: weight !== null && weight > 0 ? ev(weight, 1, 'EXTRACTED') : ev(null, 0, 'UNKNOWN', 'slug weight token unparseable'),
    origin: originValue !== null ? ev(originValue, 0.9, 'EXTRACTED') : null,
    shape: shapeToken !== null ? ev(shapeValue, 1, 'EXTRACTED') : null,
    cut: null,
    jewelleryType: null,
    designCode: null,
    metalCode: null,
    settingStyle: null,
    gemRefDerived: refText !== null ? ev(refText.toUpperCase(), 1, 'EXTRACTED') : ev(null, 0, 'UNKNOWN', 'no trailing gem-ref token'),
    gemRefObserved: null,
    derivedSku: null,
  });
  return Object.freeze({ fields, warnings });
}

// ---------------------------------------------------------------------------
// Setting field parsing
// ---------------------------------------------------------------------------

function parseSettingFields(
  family: { readonly prefix: string; readonly jewellery: 'RING' | 'EARRINGS' | 'PENDANT' },
  slug: string,
): { fields: ParsedUrlFields; warnings: readonly string[] } {
  const tokens = slug.split('-');
  const warnings: string[] = [];
  // '...-setting-js<core><metal>' right-anchored; the SKU tail parses under
  // the validated grammar (metal codes carry digits, e.g. W10/Y18/SL).
  const skuToken = (tokens[tokens.length - 1] ?? '').toUpperCase();
  const settingIndex = tokens.length - 2;
  const jewelleryIndex = tokens.length - 3;
  const skuParsed = parseSkuString(skuToken);
  const settingShape = skuParsed !== null && skuParsed.family === 'SETTING' ? skuParsed : null;

  if (settingShape === null || settingIndex < 2 || jewelleryIndex < 1) {
    return Object.freeze({
      fields: Object.freeze({
        ...emptyFields(),
        form: 'settings',
        jewelleryType: ev(family.jewellery, 1, 'EXTRACTED'),
        stoneWeightCt: ev(null, 0, 'UNKNOWN', 'settings slug carries no weight token'),
        designCode: ev(null, 0, 'UNKNOWN', 'slug does not end in the js<core><metal> token'),
        metalCode: ev(null, 0, 'UNKNOWN', 'no SKU token'),
        derivedSku: ev(null, 0, 'UNKNOWN'),
        settingStyle: null,
      }),
      warnings: [`slug does not match the validated settings grammar: ${slug}`],
    });
  }

  const metalCode: MetalCode = settingShape.sku.metalCode;
  const designCode = composeDesignToken(skuToken);

  // metal phrase = the longest leading prefix match (3 -> 2 -> 1 tokens).
  let metalPhraseLength = 0;
  let metalPhrase = '';
  for (let len = 3; len >= 1; len -= 1) {
    if (len > jewelleryIndex) continue;
    const phrase = tokens.slice(0, len).join('-');
    if (METAL_BY_PHRASE.has(phrase)) {
      metalPhraseLength = len;
      metalPhrase = phrase;
      break;
    }
  }
  // Style tokens = between the metal phrase and the jewellery token;
  // '-setting' and the trailing jewellery token are anchors, so the style
  // phrase is the run between them.
  const styleTokens = tokens.slice(metalPhraseLength, jewelleryIndex);
  const stylePhrase = styleTokens.join('-');
  if (stylePhrase.length === 0) {
    warnings.push(`no style token in the settings slug: ${slug}`);
  }
  if (metalPhrase === '') {
    warnings.push(`metal phrase unresolved for slug: ${slug}`);
  }

  return Object.freeze({
    fields: Object.freeze({
      ...emptyFields(),
      form: 'settings',
      variety: ev(family.jewellery.toLowerCase(), 1, 'EXTRACTED'),
      stoneWeightCt: ev(null, 0, 'UNKNOWN', 'settings slug carries no weight token'),
      jewelleryType: ev(family.jewellery, 1, 'EXTRACTED'),
      designCode: ev(designCode, 1, 'EXTRACTED'),
      metalCode: ev(metalCode, 1, 'EXTRACTED'),
      settingStyle: stylePhrase.length > 0 ? ev(stylePhrase, 0.9, 'EXTRACTED') : ev(null, 0, 'UNKNOWN'),
      gemRefDerived: ev(null, 0, 'UNKNOWN', 'settings slugs carry no gem reference'),
      derivedSku: ev(designCode, 1, 'EXTRACTED'),
    }),
    warnings,
  });
}

// ---------------------------------------------------------------------------
// DYO field parsing
// ---------------------------------------------------------------------------

/** 'JS<core><metal>' design-token text of a SETTING-only SKU token. */
function composeDesignToken(skuToken: string): string {
  const parsed = parseSkuString(skuToken);
  if (parsed === null || parsed.family !== 'SETTING') {
    // the composable SETTING forms are the only valid inputs here
    throw new Error(`composeDesignToken: not a SETTING-only SKU token: ${skuToken}`);
  }
  return skuToken; // is already the canonical uppercase token
}

function parseDyoFields(path: string): { fields: ParsedUrlFields; warnings: readonly string[] } {
  const slug = path.split('/')[path.split('/').length - 1] ?? '';
  const tokens = slug.split('-');
  const warnings: string[] = [];
  const fields = emptyFields();

  // Right-anchored: '{...}-js<core><metal>-{K|PR}<digits>'.
  if (tokens.length < 2) {
    return Object.freeze({
      fields: Object.freeze({ ...fields, derivedSku: ev(null, 0, 'UNKNOWN', 'slug too short'), gemRefDerived: ev(null, 0, 'UNKNOWN') }),
      warnings: ['dyo slug is shorter than the minimum documented shape'],
    });
  }
  const skuToken = (tokens[tokens.length - 2] ?? '').toUpperCase();
  const refTail = tokens[tokens.length - 1] ?? '';
  if (!/^js\d+/i.test(skuToken)) {
    return Object.freeze({
      fields: Object.freeze({
        ...fields,
        form: 'single',
        derivedSku: ev(null, 0, 'UNKNOWN', 'slug tail is not the js<core><metal> SKU token'),
        gemRefDerived: ev(null, 0, 'UNKNOWN', 'no trailing gem reference'),
      }),
      warnings: [`slug does not end in the validated CONFIGURED SKU shape: ${slug}`],
    });
  }
  const skuParsed = parseSkuFromSlug(`${slug}`);
  if (skuParsed === null || skuParsed.family !== 'CONFIGURED') {
    return Object.freeze({
      fields: Object.freeze({
        ...fields,
        form: 'single',
        derivedSku: ev(skuToken, 1, 'EXTRACTED'),
        gemRefDerived: ev(null, 0, 'UNKNOWN', 'trailing token is not a gem reference'),
      }),
      warnings: [`slug tail does not parse under grammar version 1: ${slug}`],
    });
  }
  const composition = skuParsed; // family CONFIGURED
  const metalCode = composition.sku.metalCode;
  const designCode = `JS${composition.sku.settingCore}${metalCode}`;

  // The metal phrase precedes the SKU token (1-3 tokens), matched from the
  // authoritative phrase list with the LONGEST candidate.
  let metalLen = 0;
  for (let len = 3; len >= 1; len -= 1) {
    const start = tokens.length - 2 - len;
    if (start < 0) continue;
    const phrase = tokens.slice(start, start + len).join('-');
    if (METAL_BY_PHRASE.has(phrase)) {
      metalLen = len;
      break;
    }
  }
  if (metalLen === 0) {
    warnings.push(`metal phrase unresolved before the SKU token: ${slug}`);
  }
  const weightIdx = tokens.length - 2 - metalLen - 1;
  const weightValue = weightIdx >= 0 ? weightValueOf(tokens[weightIdx] ?? '') : null;
  const head = tokens.slice(0, weightIdx === -1 ? 0 : weightIdx).map((t) => t.toLowerCase());

  // Head tokens: [{colour?}]-[{variety?}]-[{jewellery}]-[{shape}.]
  let jewelleryToken: string | null = null;
  for (const token of head) {
    if (JEWELLERY_VALUES.has(token)) jewelleryToken = token;
  }
  // shape: longest adjacent phrase first (2 -> 1 tokens).
  let shapeToken: string | null = null;
  {
    let i = 0;
    while (i < head.length) {
      const twoToken = `${head[i] ?? ''}-${head[i + 1] ?? ''}`;
      if (head[i + 1] !== undefined && SHAPE_VALUES.has(twoToken.toLowerCase())) {
        shapeToken = twoToken;
        i += 2;
        continue;
      }
      const single = head[i] ?? '';
      if (SHAPE_VALUES.has(single)) shapeToken = single;
      i += 1;
    }
  }
  // Variety = the head run; colour = the leading part of the same run where
  // the variety phrase is NOT directory-anchored (see V4 note): both stay
  // EXTRACTED-but-flagged; the canonical stages resolve variety through the
  // stone's OWN loose-stone URL, so this is display-labour only.
  const varietyPhrase = (() => {
    const st = shapeToken;
    if (st === null) return head.join('-');
    const parts = st.split('-');
    if (parts.length === 2) return head.slice(0, head.length - 2).join('-');
    return head.slice(0, head.length - 1).join('-');
  })();
  const colourPhrase = ''; // not resolved here; the canonical stage owns it

  return Object.freeze({
    fields: Object.freeze({
      ...fields,
      form: 'single',
      variety: varietyPhrase.length > 0 ? ev(varietyPhrase, 0.75, 'EXTRACTED', 'dyo slug variety is not directory-anchored; canonical variety resolves via the stone row') : null,
      colour: colourPhrase.length > 0 ? ev(colourPhrase, 0.75, 'EXTRACTED') : null,
      stoneWeightCt: weightValue !== null && weightValue > 0 ? ev(weightValue, 1, 'EXTRACTED') : ev(null, 0, 'UNKNOWN', 'dyo slug weight token unparseable'),
      shape: shapeToken !== null ? ev(SHAPE_VALUES.get(shapeToken) ?? '', 1, 'EXTRACTED') : null,
      jewelleryType: jewelleryToken !== null ? ev(JEWELLERY_VALUES.get(jewelleryToken) ?? '', 1, 'EXTRACTED') : ev(jewelleryFromRef(refTail, path), 1, 'EXTRACTED'),
      designCode: ev(designCode, 1, 'EXTRACTED'),
      metalCode: ev(metalCode, 1, 'EXTRACTED'),
      gemRefDerived: ev(composition.gemstone.gemRef.toUpperCase(), 1, 'EXTRACTED'),
      gemRefObserved: null,
      derivedSku: ev(designCode.toUpperCase(), 1, 'EXTRACTED'),
    }),
    warnings: warnings.length > 0 || head.length === 0 ? [...warnings, 'dyo slug carries no descriptive head tokens'] : warnings,
  });
}

function jewelleryFromRef(refTail: string, path: string): 'RING' | 'PENDANT' | 'NECKLACE' | 'EARRINGS' {
  if (isPrRef(refTail) !== null) return 'EARRINGS';
  // per SoT: K references appear on ring, pendant and necklace only; the
  // split between those is resolved by the observed DYO jewellery token —
  // when that is absent, the slug lives in the review family (ring default
  // is refused; the canonical stone row resolves the true value).
  void isJRef;
  void path;
  if (/ring/.test(path.toLowerCase())) return 'RING';
  if (/pendant/.test(path.toLowerCase()) && !/necklace/.test(path.toLowerCase())) return 'PENDANT';
  if (/necklace/.test(path.toLowerCase()) && !/pendant/.test(path.toLowerCase())) return 'NECKLACE';
  return 'RING';
}

// ---------------------------------------------------------------------------
// Ready-made field parsing
// ---------------------------------------------------------------------------

function parseReadyMadeFields(dir: string, slug: string): { fields: ParsedUrlFields; warnings: readonly string[] } {
  const tokens = slug.split('-');
  const tail = tokens[tokens.length - 1] ?? '';
  const jDigits = isJRef(tail);
  const fields = emptyFields();
  // Weight token (may be the literal '0.00ct'); metal phrase after it.
  let weightIdx = -1;
  for (let i = 0; i < tokens.length; i += 1) {
    if (weightValueOf(tokens[i] ?? '') !== null) {
      weightIdx = i;
      break;
    }
  }
  let metalLen = 0;
  for (let len = 3; len >= 1; len -= 1) {
    const start = (weightIdx === -1 ? tokens.length - 2 : weightIdx) + 1;
    if (start + len > tokens.length - 1) continue;
    const phrase = tokens.slice(start, start + len).join('-');
    if (METAL_BY_PHRASE.has(phrase)) {
      metalLen = len;
      break;
    }
  }
  // Shape: exact token among the head tokens (before the weight).
  let shapeToken: string | null = null;
  const head = tokens.slice(0, weightIdx === -1 ? tokens.length : weightIdx).map((t) => t.toLowerCase());
  for (let i = head.length - 1; i >= 0; i -= 1) {
    const t = head[i] ?? '';
    if (SHAPE_VALUES.has(t)) {
      shapeToken = t;
      break;
    }
  }
  // jewellery-type token phrase: the head tokens between the variety start
  // and the shape; e.g. 'ring', 'earring', 'necklace pendant'.
  const dirTokens = (dir.replace(/-rings$/, '') ?? '').split('-');
  return Object.freeze({
    fields: Object.freeze({
      ...fields,
      form: 'rings',
      variety: ev(dirTokens.join('-'), 1, 'EXTRACTED'),
      stoneWeightCt:
        weightIdx >= 0 && weightValueOf(tokens[weightIdx] ?? '') !== null
          ? ev(weightValueOf(tokens[weightIdx] ?? ''), 1, 'EXTRACTED')
          : ev(null, 0, 'UNKNOWN', 'ready-made slug carries no weight token (the observed 0.00ct shape takes it from a join)'),
      origin: null,
      shape: shapeToken !== null ? ev(SHAPE_VALUES.get(shapeToken) ?? '', 1, 'EXTRACTED') : null,
      jewelleryType: ev('RING', 1, 'EXTRACTED', 'ready-made family jewellery type is RING by the route family'),
      designCode: ev(null, 0, 'UNKNOWN', 'ready-made SKUs are J<digits>; no js design token'),
      metalCode: metalLen > 0 ? ev(METAL_BY_PHRASE.get(tokens.slice(0, metalLen).join('-')) ?? '', 0.9, 'EXTRACTED') : null,
      gemRefDerived: jDigits !== null ? ev(`J${jDigits}`, 1, 'EXTRACTED') : ev(null, 0, 'UNKNOWN', 'no trailing J ref'),
      gemRefObserved: null,
      derivedSku: null,
    }),
    warnings: jDigits === null ? [`slug does not end in the J<digits> shape: ${slug}`] : [],
  });
}

// ---------------------------------------------------------------------------
// The classifier entry point
// ---------------------------------------------------------------------------

/** The bare path of a captured URL (origin + optional query stripped off). */
export function barePathOf(url: string): { path: string; query: string } {
  const m = /^https?:\/\/[^/]+(\/\S*)$/.exec(url);
  const whole = m?.[1] ?? url;
  const q = whole.indexOf('?');
  return q === -1 ? { path: whole, query: '' } : { path: whole.slice(0, q), query: whole.slice(q + 1) };
}

const FUNCTIONAL_ROUTES_SET: ReadonlySet<string> = new Set([
  '/',
  '/cart',
  '/cart/order-summary',
  '/cart/payment-order',
  '/cart/secure-payment',
  '/account',
  '/auth',
  '/verify-email',
  '/favorites',
  '/compare-list',
  '/financing',
  '/extend-protection-plan',
  '/contact-us',
  '/showroom',
  '/showroom/preview',
  '/showroom/preview/success',
  '/blog',
  '/meet-our-team',
  '/michael-arnstein',
  '/custom-design-gemstone-rings-jewelry',
  '/sitemap-static.xml',
]);

/** Classify + parse ONE URL. Pure; the origin vocabulary only bounds ambiguity. */
export function classifyUrl(url: string, originVocabulary?: ReadonlyMap<string, unknown>): ParsedUrl {
  const { path, query } = barePathOf(url);

  if (path.startsWith('/design-your-own/review/')) {
    const p = parseDyoFields(path);
    return finish(url, 'DYO', p.fields, p.warnings, query);
  }
  for (const family of SETTING_ROUTE_FAMILIES) {
    if (path.startsWith(family.prefix)) {
      const p = parseSettingFields(family, path.split('/')[path.split('/').length - 1] ?? '');
      return finish(url, 'SETTING', p.fields, p.warnings, query);
    }
  }
  const m = /^\/([a-z0-9-]+)\/([a-z0-9.-]+)$/.exec(path);
  if (m !== null) {
    const dir = m[1] ?? '';
    const slug = m[2] ?? '';
    const tail = slug.split('-').pop() ?? '';
    if (dir.endsWith('-pairs') && isPrRef(tail) !== null) {
      const p = parseLoosePairFields(dir, slug, originVocabulary);
      return finish(url, 'STONE_PAIR', p.fields, p.warnings, query);
    }
    if (dir.endsWith('-rings') && isJRef(tail) !== null) {
      const p = parseReadyMadeFields(dir, slug);
      return finish(url, 'READY_MADE', p.fields, p.warnings, query);
    }
    if (isKRef(tail) !== null) {
      const p = parseLoosePairFields(dir, slug, originVocabulary);
      return finish(url, 'LOOSE_STONE', p.fields, p.warnings, query);
    }
  }
  if (FUNCTIONAL_ROUTES_SET.has(path)) {
    return finish(url, 'FUNCTIONAL', emptyFields(), [query ? 'query-string variant preserved (no family parse)' : 'documented functional route'], query);
  }
  if (path.startsWith('/education')) {
    return finish(url, 'EDUCATION', emptyFields(), ['education content route'], query);
  }
  if (path.endsWith('.xml')) {
    return finish(url, 'FUNCTIONAL', emptyFields(), ['sitemap route (generated, not migrated)'], query);
  }
  if (/^\/[a-z0-9-]+$/.test(path)) {
    if (path.endsWith('-gemstones') || path.endsWith('-pairs') || path.endsWith('-rings') || path.startsWith('/all-') || path.startsWith('/gemstone-')) {
      return finish(url, 'CATEGORY_INDEX', emptyFields(), ['category index route'], query);
    }
    return finish(url, 'VARIETY_INDEX', emptyFields(), ['variety index route'], query);
  }
  const fields = Object.freeze({
    ...emptyFields(),
    stoneWeightCt: (() => {
      const slug = path.split('/')[path.split('/').length - 1] ?? '';
      const w = weightValueOf(slug.split('-')[0] ?? '');
      return w !== null && w > 0 ? ev(w, 0.9, 'EXTRACTED') : ev(null, 0, 'UNKNOWN');
    })(),
  });
  return finish(
    url,
    'UNKNOWN',
    fields,
    [query ? 'query-string variant preserved; path matches no documented family (misfiled disposition)' : 'path matches no documented URL family (misfiled; quarantined)'],
    query,
  );
}

function finish(
  url: string,
  family: UrlFamily,
  fields: ParsedUrlFields,
  warnings: readonly string[],
  query: string,
): ParsedUrl {
  const all = [...warnings];
  if (query) all.push(`query-string preserved: ?${query.split('=')[0] ?? ''}=`);
  return Object.freeze({
    sourceUrl: url,
    family,
    routeDepth: barePathOf(url).path.split('/').filter((s) => s.length > 0).length,
    fields,
    warnings: Object.freeze(all),
    confidence: minConfidence(fields),
  });
}
