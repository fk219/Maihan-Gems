/**
 * packages/domain — the SKU grammar parser (Phase 1 Task 7).
 *
 * Authority: PROJECT_SOURCE_OF_TRUTH.md section 1.1 ("Decoded SKU grammar",
 * [VERIFIED][OBSERVED]) and section 3.1 Example B (the validated slug regex,
 * 1,024/1,024 with 0 mismatches); technical_design/10 "SKU grammar";
 * technical_design/05 "Domain services" (SkuGrammar.parse / SkuGrammar.compose,
 * "inverse of parse", validated 1,024/1,024); technical_design/33 gates V3+V19;
 * ADR-007/D1 (products.jsonl is SKY ground truth ONLY, never the catalogue).
 *
 * The grammar is NOT broadened beyond the validated forms:
 *
 *   SETTING     JS<designCore><metalCode>                 e.g. JS1016W10, JS1169SL
 *   CONFIGURED  JS<designCore><metalCode>-<gemRef>        e.g. JS1383R14-PR5681, JS1150W14-K1324
 *   READY-MADE  J<digits>                                 e.g. J10347
 *   gemRef      K<digits> (single stone) | PR<digits> (matched pair)
 *
 * Evidence-supported facts held verbatim:
 *   - The metal alphabet is the 15 `metal_code` enum members. The DYO corpus
 *     uses 11 of them; `R10` (and W10/Y10/SL in the DYO set) remain valid
 *     grammar symbols because they are enum-valid even where unobserved.
 *   - Every DYO review slug ends with the lowercased SKU token
 *     (`...-js<core><metal>-<k|pr><digits>`), so derivation from a slug is a
 *     trailing-token extraction, not a full-string guess.
 *   - Case canonicalisation IS the design: source slugs are lowercase, observed
 *     SKUs uppercase; Example B's control re-run ruled out a case-folding
 *     defect, i.e. lowercase slug text maps to the uppercase SKU.
 *
 * Observations stay observations: this parser produces STRUCTURE. It never
 * manufactures a SourceSku — observed values enter through
 * parseSourceSku(sourceValue) and derived ones through
 * parseDerivedSku(composedText, provenance) with the URL_SLUG method.
 * Plan task 15 owns any database write path.
 *
 * Pure TypeScript: no infrastructure, no I/O, deterministic, and it mutates no
 * input. Construction is delegated to the Task 6 value objects (single SKU
 * model — no second SKU type).
 */
import {
  METAL_CODES,
  parseMetalCode,
  type GemstoneKind,
  type MetalCode,
} from '../enums.js';
import { DomainError } from '../errors.js';
import { isGemRef, isPairGemRef, parseGemRef, type GemRef } from '../value-objects/gem-ref.js';
import { isSettingCore, parseSku, type Sku } from '../value-objects/sku.js';

/**
 * Version of the validated grammar this parser implements. Recorded on every
 * DerivedSku produced through the URL_SLUG provenance path. The initial
 * version '1' is the initial validated port of SoT section 1.1.
 */
export const SKU_GRAMMAR_VERSION = '1';

/** The three SKU families the grammar distinguishes (doc 10). */
export type SkuFamily = 'SETTING' | 'CONFIGURED' | 'READY_MADE';

/** The three forms the grammar produces (doc 10 "SKU grammar"). */
export type ParsedSku =
  | {
      readonly family: 'SETTING';
      /** Composite value object from Task 6; gemRef is absent for a setting-only SKU. */
      readonly sku: Sku;
    }
  | {
      readonly family: 'CONFIGURED';
      readonly sku: Sku;
      readonly gemstone: { readonly gemRef: GemRef; readonly kind: GemstoneKind };
    }
  | {
      readonly family: 'READY_MADE';
      readonly readyMadeNumber: string;
    };

// The metal alphabet, longest-first for deterministic alternation matching.
const METAL_ALTERNATION = [...METAL_CODES].sort((a, b) => b.length - a.length).join('|');

/**
 * Canonical SKU token: JS<digits><METAL>[-(K|PR)<digits>] — uppercase.
 * METAL_CODES are letter-initial, so the core is unambiguously the digit run
 * between 'JS' and the first metal letter.
 */
const SKU_TOKEN_RE = new RegExp(`^JS(\\d+)(${METAL_ALTERNATION})(?:-(K|PR)(\\d+))?$`);

/** READY-MADE: J<digits>, never 'JS...' (which is the setting prefix). */
const READY_MADE_RE = /^J(\d+)$/;

/**
 * Example B's validated slug tail: a DYO review slug ends with the lowercased
 * SKU token, boundary-prefixed by '-' (or the slug start). Case-insensitive so
 * slug text ('js1383r14-pr5681') matches and canonicalises.
 */
const SLUG_TOKEN_RE = new RegExp(`(?:^|-)(js\\d+(${METAL_ALTERNATION})(?:-(k|pr)(\\d+))?)$`, 'i');

function classificationFailure(value: string): string {
  if (value.length === 0) return 'empty input';
  if (/\s/.test(value)) return 'whitespace is not part of a SKU';
  if (value !== value.toUpperCase() && /^(j|js)/i.test(value)) {
    return 'non-canonical case: a SKU string is uppercase (a URL slug belongs to parseSkuFromSlug)';
  }
  if (READY_MADE_RE.test(value)) {
    return `ready-made form is unparseable: '${value}' matched no grammar form`;
  }
  if (!value.startsWith('JS')) {
    return `unrecognised prefix: expected 'JS<designCore><metalCode>[-<gemRef>]' or 'J<digits>'; got '${value.slice(0, 12)}'`;
  }
  const afterPrefix = value.slice(2);
  const firstLetter = afterPrefix.search(/[A-Z]/);
  if (firstLetter === -1) return 'missing metal code after the design core';
  const core = afterPrefix.slice(0, firstLetter);
  if (core.length === 0) return 'missing design core (JS must be followed by digits)';
  if (!isSettingCore(core)) return `invalid design core '${core}'`;
  let index = 2 + core.length;
  const metalCandidate = /^([A-Z]+)/.exec(value.slice(index))?.[1] ?? '';
  const metal = (METAL_CODES as readonly string[]).includes(metalCandidate)
    ? metalCandidate
    : /^([A-Z]{1,2})\d{0,2}/.exec(value.slice(index))?.[1] ?? metalCandidate;
  if (!(METAL_CODES as readonly string[]).includes(metal)) return `invalid metal code '${metalCandidate}' after design core '${core}'`;
  index += metal.length;
  const remainder = value.slice(index);
  if (remainder.length === 0) return `unexpected trailing text '${remainder}'`;
  if (!remainder.startsWith('-')) return `missing '-' separator before the gemstone reference`;
  const gemRefPart = remainder.slice(1);
  if (gemRefPart.length === 0) return 'missing gemstone reference after the separator';
  if (!isGemRef(gemRefPart)) {
    return `malformed gemstone reference '${gemRefPart}' (expected K<digits> or PR<digits>)`;
  }
  return `unrecognised SKU form '${value}'`;
}

function parseSettingToken(core: string, metalText: string, gemRef?: GemRef): ParsedSku {
  // The regex already guarantees membership; parseMetalCode re-asserts it and
  // yields the branded MetalCode for the Task 6 composite.
  const sku = parseSku(core, parseMetalCode(metalText), gemRef);
  if (gemRef === undefined) {
    return Object.freeze({ family: 'SETTING', sku } as const);
  }
  return Object.freeze({
    family: 'CONFIGURED',
    sku,
    gemstone: Object.freeze({ gemRef, kind: isPairGemRef(gemRef) ? 'PAIR' : 'SINGLE' } as const),
  } as const);
}

/** Parses a canonical-style SKU token ('JS1383R14-PR5681', 'js1150w14', 'J10347'). Returns null when the text is not a SKU. */
export function parseSkuString(value: string): ParsedSku | null {
  const tokenMatch = SKU_TOKEN_RE.exec(value);
  if (tokenMatch !== null) {
    const core = tokenMatch[1] ?? '';
    const metal = tokenMatch[2] ?? '';
    const refPrefix = tokenMatch[3];
    const refDigits = tokenMatch[4];
    // Route through the Task 6 value objects: membership + brands are theirs.
    return parseSettingToken(
      core,
      metal,
      refPrefix === undefined ? undefined : parseGemRef(`${refPrefix}${refDigits ?? ''}`),
    );
  }
  const readyMadeMatch = READY_MADE_RE.exec(value);
  if (readyMadeMatch !== null) {
    return Object.freeze({ family: 'READY_MADE', readyMadeNumber: readyMadeMatch[1] ?? '' } as const);
  }
  return null;
}

/**
 * Doc 05's precise-error surface: same verdicts as parseSkuString, but a
 * malformed SKU raises DomainError('INVALID_SKU') with the deterministic
 * reason instead of returning null (use parseSkuString where non-SKU input is
 * an expected classification outcome).
 */
export function parseSkuOrThrow(value: string): ParsedSku {
  const parsed = parseSkuString(value);
  if (parsed === null) {
    throw new DomainError('INVALID_SKU', `SKU does not match the validated grammar: ${classificationFailure(value)}`);
  }
  return parsed;
}

/**
 * Example B's validated derivation: extract the trailing SKU token from a DYO
 * review slug (anchor at the slug end, '-'-bounded), canonicalise its case and
 * delegate to the same grammar. Returns null when the slug does not end with a
 * SKU token (e.g. variety pages, non-SKU families — an expected outcome for
 * the wider URL corpus, halted as a defect only by the V1/V2 gates).
 */
export function parseSkuFromSlug(slug: string): ParsedSku | null {
  const tail = SLUG_TOKEN_RE.exec(slug)?.[1];
  if (tail === undefined) return null;
  return parseSkuString(tail.toUpperCase());
}

/**
 * Doc 05's SkuGrammar.compose — the inverse of parse for the setting forms:
 * {designCore, metalCode, gemRef?} -> 'JS<core><metal>[-<gemRef>]'.
 * Inputs are the branded Task 6 value objects, so only canonical values are
 * accepted; the result is always uppercase canonical text.
 */
export function composeSku(components: {
  readonly settingCore: string;
  readonly metalCode: MetalCode;
  readonly gemRef?: GemRef;
}): string {
  if (!isSettingCore(components.settingCore)) {
    throw new DomainError('INVALID_SKU', `composeSku: design core must be numeric digits; got '${components.settingCore}'`);
  }
  const suffix = components.gemRef === undefined ? '' : `-${components.gemRef}`;
  return `JS${components.settingCore}${components.metalCode}${suffix}`;
}
