/**
 * packages/domain — the D9 multi-value tokenizer (plan task 13; doc 05
 * "The D9 tokenizer"; doc 10 "The D9 tokenizer"; SoT §4.4 defect D9).
 *
 * [DEFECT D9] [VERIFIED] 113 source records carry CONCATENATED per-stone
 * values with the delimiter lost: `"Blue Blue"`, `"Emerald Cut Emerald
 * Cut"`, `"K1324 K1324"`, `"Length: X Width: Y Height: Z Length: X2
 * Width: Y2 Height: Z2"`, `"2.87 Ct. 3.11 Ct."`. This is NOT a duplicate
 * render: for the pair family it genuinely describes two stones, and the
 * per-stone weights sum exactly to the `Ct.Tw.` figure in the product name
 * (113/113). Naive normalisation would create facets literally named
 * `"Pink Pink"` (plan risk R-5).
 *
 * The tokenizer preserves the documented doubled forms:
 *
 *   - `weight`    -> split on /([\d.]+)\s*Ct\./g            -> tokenCount 1 or 2
 *   - `dimensions`-> split on /Length:/g                     -> tokenCount 1 or 2
 *   - other fields-> tokenCount 2 iff value === `${A} ${A}`  (doubled render of
 *                    the same per-stone value), else 1.
 *
 * `tokenCount` drives `gemstone_stones` row creation (1 row SINGLE, 2 rows
 * PAIR) and `clarity_labels.is_doubled`. No evidence is normalised away:
 * callers keep the raw string verbatim (`raw_spec`).
 *
 * Pure TypeScript: no infrastructure, no I/O, deterministic, no mutation.
 */
export type SpecValueField =
  | 'weight'
  | 'dimensions'
  | 'stone_type'
  | 'item_id'
  | 'color'
  | 'color_intensity'
  | 'clarity'
  | 'shape'
  | 'cut'
  | 'cutting_style'
  | 'enhancements'
  | 'origin'
  | 'per_carat_price';

export interface TokenResult {
  /** The per-stone token strings, in source order. */
  readonly tokens: readonly string[];
  /** 1 = single-valued (or a single-stone product); 2 = pair. */
  readonly tokenCount: 1 | 2;
  /** True iff the source string holds a doubled (per-stone concatenated) form. */
  readonly isDoubled: boolean;
}

/** Collapse a doubled generic form (`A A`) into its single value. */
const DOUBLED_RE = /^(.+) \1$/u;

/** A weight token: '{digits}[.{digits}]' followed by 'Ct.' (case-insensitive). */
const WEIGHT_TOKEN_RE = /([\d.]+)\s*Ct\./gi;
/** One dimensions section. */
const DIMENSIONS_TOKEN_RE = /Length:\s*([\d.]+)\s+Width:\s*([\d.]+)\s+Height:\s*([\d.]+)/gi;

/**
 * Tokenize one captured specification value.
 *
 * - `weight`: returns one token per 'Ct.' figure ('2.87 Ct.' verbatim).
 * - `dimensions`: returns one token per Length/Width/Height section, each
 *   formatted verbatim ('Length: 9.84 Width: 7.82 Height: 5.32').
 * - everything else: the doubled form `${A} ${A}` yields [A, A]; anything
 *   else is a single value [raw].
 *
 * Empty input -> empty tokens with tokenCount 1 and isDoubled false: an
 * honest refusal, never a plausible value.
 */
export function tokenizeStoneValues(raw: string, field: SpecValueField): TokenResult {
  if (raw.trim().length === 0) {
    return Object.freeze({ tokens: Object.freeze([]), tokenCount: 1, isDoubled: false });
  }
  if (field === 'weight') {
    const figures: string[] = [];
    for (const m of raw.matchAll(WEIGHT_TOKEN_RE)) {
      figures.push(`${m[1]} Ct.`);
      if (figures.length >= 2) break; // documented pairs have exactly 2 stones
    }
    if (figures.length === 0) {
      return Object.freeze({ tokens: Object.freeze([]), tokenCount: 1, isDoubled: false });
    }
    const isDoubled = figures.length === 2;
    return Object.freeze({ tokens: Object.freeze(figures), tokenCount: isDoubled ? 2 : 1, isDoubled });
  }
  if (field === 'dimensions') {
    const sections: string[] = [];
    for (const m of raw.matchAll(DIMENSIONS_TOKEN_RE)) {
      sections.push(`Length: ${m[1]} Width: ${m[2]} Height: ${m[3]}`);
      if (sections.length >= 2) break;
    }
    if (sections.length === 0) {
      // Unparseable dimensions text: single raw token, flagged by the caller
      // through parse warnings — never a fabricated numeric value.
      return Object.freeze({ tokens: Object.freeze([raw.trim()]), tokenCount: 1, isDoubled: false });
    }
    const isDoubled = sections.length === 2;
    return Object.freeze({ tokens: Object.freeze(sections), tokenCount: isDoubled ? 2 : 1, isDoubled });
  }
  // Generic fields: doubled iff value === `${A} ${A}`.
  const m = DOUBLED_RE.exec(raw);
  if (m !== null) {
    const single = m[1] ?? '';
    return Object.freeze({ tokens: Object.freeze([single, single]), tokenCount: 2, isDoubled: true });
  }
  return Object.freeze({ tokens: Object.freeze([raw]), tokenCount: 1, isDoubled: false });
}

/**
 * Exact-decimal addition for carat strings via scaled integers (milli-carats
 * at NUMERIC(8,3) precision). No float drift in a validation path: 2.87 +
 * 3.11 must equal 5.98 EXACTLY, which is what gate V8 asserts.
 */
export function caratSumMilli(values: readonly string[]): number {
  let sum = 0;
  for (const value of values) {
    const m = /^(\d+)(?:\.(\d*))?$/.exec(value);
    if (m === null) throw new Error(`caratSum: not a decimal string: ${value}`);
    const whole = Number(m[1] ?? '0');
    const frac = (m[2] ?? '').padEnd(3, '0').slice(0, 3);
    sum += whole * 1_000 + Number(frac === '' ? '0' : frac);
  }
  return sum;
}

/** Normalise a decimal string to the NUMERIC(8,3) shape ('2.870'). */
export function caratText(value: string): string {
  const m = /^(\d+)(?:\.(\d*))?$/.exec(value);
  if (m === null) throw new Error(`caratText: not a decimal string: ${value}`);
  return `${m[1]}.${(m[2] ?? '').padEnd(3, '0').slice(0, 3)}`;
}
