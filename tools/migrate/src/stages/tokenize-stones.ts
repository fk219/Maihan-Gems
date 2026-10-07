/**
 * tools/migrate — stage "tokenize-stones" (Phase 2 Global Task 13 = plan
 * detailed tasks 6+7, epic E2.3).
 *
 * Plan task 13 (verbatim): "Implement the D9 multi-value tokenizer producing
 * `gemstone_stones` rows." Done when "gates V8, V9 pass on all 113 pairs".
 *
 * What this stage does:
 *   - Loads the verified `specifications.jsonl` artifact and groups its
 *     12,401 rows into 1,024 product field maps (12 fields each, +1
 *     structured `stone_type` on the 113 pair pages).
 *   - Runs the PURE D9 tokenizer (packages/domain, the single engine) over
 *     every captured value, preserving the doubled forms.
 *   - Hammers gates V8+V9 against the REAL corpus: for every pair page the
 *     per-stone weights sum EXACTLY to the Ct.Tw. figure in the observed
 *     product name AND to the '{w}ct' figure in the review slug (113/113);
 *     the 911 single-stone pages tokenize to exactly 1 figure.
 *
 * Where the rows land: `gemstone_stones` references `gemstones(id)`, which
 * the canonical stage creates; the tokenizer's tokenised dataset is therefore
 * written to the canonical rows by the 'canonical-catalog' stage, which
 * CONSUMES this module's tokenizer. The coupling is explicit and reported
 * (the D9 tokenizer is produced exactly once, here, and the canonical stage
 * is its only database consumer). Read-only over the archive throughout.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import type { StageContext } from './context.js';
import { jsonLines } from './context.js';
import { caratSumMilli, caratText, tokenizeStoneValues, type SpecValueField, type TokenResult } from '@maihan/domain';

export const EXPECTED_SPEC_PRODUCTS = 1_024;
export const EXPECTED_PAIR_PAGES = 113;
export const EXPECTED_SINGLE_PAGES = 911;

/** The 13 captured specification fields -> the tokenizer's field classes. */
export const SPEC_FIELD_CLASSES: Readonly<Record<string, SpecValueField>> = Object.freeze(
  Object.fromEntries(
    (
      [
        ['item_id', 'item_id'],
        ['stone_type', 'stone_type'],
        ['weight', 'weight'],
        ['dimensions_mm_help', 'dimensions'],
        ['color_help', 'color'],
        ['color_intensity_help', 'color_intensity'],
        ['clarity_help', 'clarity'],
        ['shape_help', 'shape'],
        ['cut', 'cut'],
        ['cutting_style', 'cutting_style'],
        ['enhancements_help', 'enhancements'],
        ['origin_help', 'origin'],
        ['per_carat_price_help', 'per_carat_price'],
      ] as const
    ).map(([source, field]) => [source, field]),
  ),
);

export type TokenizedFields = Record<string, TokenResult>;

export interface TokenizeStageResult {
  readonly productsProcessed: number;
  readonly pairPages: number;
  readonly singlePages: number;
  readonly stonesRows: number; // 113*2 + 911*1 = 1,137
}

const MANIFEST = 'docs/evidence/MANIFEST.md';
void MANIFEST;

/**
 * Load + group + tokenize the verified specification artifact. Pure data
 * engine: reads the artifact bytes (read-only) and tokenizes every value.
 * Returns the product page map.
 */
export async function loadTokenizedSpecifications(path: string, expectDigest?: string): Promise<Map<string, TokenizedFields>> {
  if (expectDigest !== undefined) {
    const actual = createHash('sha256').update(readFileSync(path)).digest('hex');
    if (actual !== expectDigest) {
      throw new Error(`tokenize-stones: specifications.jsonl digest mismatch: expected ${expectDigest}, actual ${actual}`);
    }
  }
  type Fields = Record<string, string>;
  const byUrl = new Map<string, Fields>();
  let rows = 0;
  for await (const { record } of jsonLines(path)) {
    rows += 1;
    const pageUrl = record['page_url'];
    const fieldKey = record['field_key'];
    const fieldValue = record['field_value'];
    if (typeof pageUrl !== 'string' || typeof fieldKey !== 'string') {
      throw new Error(`tokenize-stones: specification row ${String(rows)} lacks page_url/field_key`);
    }
    const fields = byUrl.get(pageUrl) ?? {};
    if (fields[fieldKey] !== undefined) {
      // a duplicate field row for one product is a provenance failure
      throw new Error(`tokenize-stones: duplicate specification row ${fieldKey} for ${pageUrl}`);
    }
    fields[fieldKey] = typeof fieldValue === 'string' ? fieldValue : JSON.stringify(fieldValue);
    byUrl.set(pageUrl, fields);
  }
  // tokenize
  const tokenized = new Map<string, TokenizedFields>();
  for (const [pageUrl, fields] of byUrl) {
    const out: TokenizedFields = {};
    for (const [sourceKey, raw] of Object.entries(fields)) {
      const fieldClass = SPEC_FIELD_CLASSES[sourceKey];
      if (fieldClass === undefined) {
        out[sourceKey] = Object.freeze({ tokens: Object.freeze([sourceKey]), tokenCount: 1, isDoubled: false });
        continue;
      }
      out[sourceKey] = Object.freeze(tokenizeStoneValues(raw, fieldClass));
    }
    tokenized.set(pageUrl, Object.freeze(out));
  }
  return tokenized;
}

/**
 * Execute the tokenize stage: gates V8+V9 against the corpus.
 * `corpus` — when false (a disposable-fixture run), the 1,024/113/911
 * census assertions are skipped; the pair fixtures found still reconcile.
 */
export async function runTokenizeStones(ctx: StageContext, options?: { corpus?: boolean; expectDigest?: string }): Promise<TokenizeStageResult> {
  const tokenized = await loadTokenizedSpecifications(ctx.artifactPath('specifications.jsonl'), options?.expectDigest);
  if (options?.corpus !== false && tokenized.size !== EXPECTED_SPEC_PRODUCTS) {
    throw new Error(`tokenize-stones: tokenized ${tokenized.size} products, expected ${EXPECTED_SPEC_PRODUCTS}`);
  }

  // Observed product names (products.jsonl; the SKU-bearing corpus)
  const namesPath = ctx.artifactPath('products.jsonl');
  const nameByUrl = new Map<string, string>();
  for (const line of readFileSync(namesPath, 'utf8').split('\n')) {
    if (line.trim().length === 0) continue;
    const r = JSON.parse(line) as { url: string; sku: string; name: string };
    if (r.sku.length === 0) continue;
    nameByUrl.set(r.url, r.name);
  }

  let pairPages = 0;
  let singlePages = 0;
  let stoneRows = 0;
  const violations: string[] = [];
  for (const [pageUrl, fields] of tokenized) {
    const figures = (fields['weight']?.tokens ?? []).map((t) => (/\d+(\.\d+)?/.exec(t)?.[0] ?? ''));
    if (figures.length === 2) {
      pairPages += 1;
      stoneRows += 2;
      const sumMilli = caratSumMilli(figures);
      const nameFigure = /(\d+\.\d+)Ct\.Tw\./i.exec(nameByUrl.get(pageUrl) ?? '');
      const slugFigure = /(\d+\.\d+)ct-/i.exec(pageUrl);
      if (nameFigure === null || slugFigure === null) {
        violations.push(`missing Ct.Tw. figure: ${pageUrl}`);
      } else {
        if (caratSumMilli([nameFigure[1] ?? '']) !== sumMilli) {
          violations.push(`gate V9: name Ct.Tw. ${String(nameFigure[1])} != summed ${caratText(String(sumMilli / 1_000))}: ${pageUrl}`);
        }
        if (caratSumMilli([...(slugFigure.slice(1) as readonly string[])]) !== sumMilli) {
          violations.push(`gate V8: slug weight ${String(slugFigure[1] ?? '')} != summed ${caratText(String(sumMilli / 1_000))}: ${pageUrl}`);
        }
      }
    } else if (figures.length === 1) {
      singlePages += 1;
      stoneRows += 1;
    } else {
      violations.push(`weight tokenizes to ${String(figures.length)} figures: ${pageUrl}`);
    }
  }

  if (pairPages !== EXPECTED_PAIR_PAGES || singlePages !== EXPECTED_SINGLE_PAGES) {
    if (options?.corpus !== false) {
      violations.push(`family census: pairs ${String(pairPages)}/${String(EXPECTED_PAIR_PAGES)}, singles ${String(singlePages)}/${String(EXPECTED_SINGLE_PAGES)}`);
    }
  }
  if (violations.length > 0) {
    throw new Error(`tokenize-stones: gates V8/V9 FAILED — ${violations.slice(0, 5).join('; ')} (${String(violations.length)} total)`);
  }
  ctx.write(`  tokenize-stones: ${String(tokenized.size)} products, pairs ${String(pairPages)}/${String(EXPECTED_PAIR_PAGES)} reconcile, singles ${String(singlePages)}, gemstone_stones rows ${String(stoneRows)}`);
  return { productsProcessed: tokenized.size, pairPages, singlePages, stonesRows: stoneRows };
}
