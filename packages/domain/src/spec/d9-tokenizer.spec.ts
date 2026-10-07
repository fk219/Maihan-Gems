/**
 * packages/domain — D9 tokenizer specs (plan task 13).
 *
 * Unit surfaces: all doubled-value forms; real corpus cases; empty input.
 * Corpus gate (real archive, SHA-256 already validated by the corpus spec
 * pattern of Task 7): V8 — per-stone weights sum to the total weight for
 * all 113 pairs; V9 — the `Ct.Tw.` figure in the source name equals the
 * summed weight; singles (911) tokenize to exactly 1 token.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import { caratSumMilli, caratText, tokenizeStoneValues } from './d9-tokenizer.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const specsPath = path.join(REPO_ROOT, 'naturalgemstones', 'reverse_engineered', 'data', 'specifications.jsonl');
const productsPath = path.join(REPO_ROOT, 'naturalgemstones', 'reverse_engineered', 'data', 'products.jsonl');
const archiveReady = existsSync(specsPath) && existsSync(productsPath);

const MANIFEST = path.join(REPO_ROOT, 'docs', 'evidence', 'MANIFEST.md');
function manifestDigest(artifact: string): string | null {
  if (!existsSync(MANIFEST)) return null;
  const text = readFileSync(MANIFEST, 'utf8');
  for (const line of text.split('\n')) {
    if (!line.includes(`\`${artifact}\``)) continue;
    const hex = /`([0-9a-f]{64})`/.exec(line);
    if (hex !== null) return hex[1] ?? null;
  }
  return null;
}

describe('D9 tokenizer — the documented doubled-value forms', () => {
  it('weights split on /Ct./ into exactly 2 tokens for pairs', () => {
    const r = tokenizeStoneValues('2.87 Ct. 3.11 Ct.', 'weight');
    expect(r.tokens).toEqual(['2.87 Ct.', '3.11 Ct.']);
    expect(r.tokenCount).toBe(2);
    expect(r.isDoubled).toBe(true);
  });

  it('singles return exactly 1 token', () => {
    const r = tokenizeStoneValues('1.28 Ct.', 'weight');
    expect(r.tokens).toEqual(['1.28 Ct.']);
    expect(r.tokenCount).toBe(1);
    expect(r.isDoubled).toBe(false);
  });

  it('dimensions split on /Length:/ into 2 sections for pairs', () => {
    const r = tokenizeStoneValues('Length: 9.84 Width: 7.82 Height: 5.32 Length: 9.83 Width: 7.64 Height: 5.78', 'dimensions');
    expect(r.tokens).toEqual(['Length: 9.84 Width: 7.82 Height: 5.32', 'Length: 9.83 Width: 7.64 Height: 5.78']);
    expect(r.tokenCount).toBe(2);
    expect(r.isDoubled).toBe(true);
  });

  it('generic doubled collapses exactly ("Pink Pink" is never a facet)', () => {
    expect(tokenizeStoneValues('Blue Blue', 'stone_type')).toEqual({ tokens: ['Blue', 'Blue'], tokenCount: 2, isDoubled: true });
    expect(tokenizeStoneValues('Emerald Cut Emerald Cut', 'cut')).toEqual({ tokens: ['Emerald Cut', 'Emerald Cut'], tokenCount: 2, isDoubled: true });
    expect(tokenizeStoneValues('K1324 K1324', 'item_id')).toEqual({ tokens: ['K1324', 'K1324'], tokenCount: 2, isDoubled: true });
    expect(tokenizeStoneValues('$590 $590', 'per_carat_price')).toEqual({ tokens: ['$590', '$590'], tokenCount: 2, isDoubled: true });
  });

  it('multiword SINGLE values are NOT collapsed (the doubled-re false positive)', () => {
    expect(tokenizeStoneValues('Very Very Slightly Included', 'clarity')).toEqual({ tokens: ['Very Very Slightly Included'], tokenCount: 1, isDoubled: false });
    expect(tokenizeStoneValues('Blue', 'stone_type')).toEqual({ tokens: ['Blue'], tokenCount: 1, isDoubled: false });
    expect(tokenizeStoneValues('Large Small', 'stone_type')).toEqual({ tokens: ['Large Small'], tokenCount: 1, isDoubled: false });
  });

  it('empty input yields an honest empty refusal', () => {
    const r = tokenizeStoneValues('', 'weight');
    expect(r.tokens).toEqual([]);
    expect(r.isDoubled).toBe(false);
  });
});

describe('exact decimal arithmetic', () => {
  it('2.87 + 3.11 == 5.98 exactly (no float drift)', () => {
    expect(caratSumMilli(['2.87', '3.11'])).toBe(caratSumMilli(['5.98']));
    expect(caratText('2.87')).toBe('2.870');
  });
});

describe('REAL corpus gates (skips without the archive)', () => {
  it.skipIf(!archiveReady)('gate V9: 113/113 — the Ct.Tw. figure equals the summed per-stone weights', () => {
    // artifact identity: both inputs must match the manifest before parsing.
    const specsDigest = manifestDigest('specifications.jsonl');
    const productsDigest = manifestDigest('products.jsonl');
    expect(specsDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(productsDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(createHash('sha256').update(readFileSync(specsPath)).digest('hex')).toBe(specsDigest);
    expect(createHash('sha256').update(readFileSync(productsPath)).digest('hex')).toBe(productsDigest);

    // group specification values per page_url
    type Fields = Record<string, string>;
    const byUrl = new Map<string, Fields>();
    for (const line of readFileSync(specsPath, 'utf8').split('\n')) {
      if (line.trim().length === 0) continue;
      const r = JSON.parse(line) as { page_url: string; field_key: string; field_value: string };
      const fields = byUrl.get(r.page_url) ?? {};
      fields[r.field_key] = r.field_value;
      byUrl.set(r.page_url, fields);
    }

    // observed SKU + name per url
    const bySkuUrl = new Map<string, { sku: string; name: string }>();
    for (const line of readFileSync(productsPath, 'utf8').split('\n')) {
      if (line.trim().length === 0) continue;
      const r = JSON.parse(line) as { url: string; sku: string; name: string };
      if (r.sku.length === 0) continue; // the documented 221 excluded set
      bySkuUrl.set(r.url, { sku: r.sku, name: r.name });
    }

    // V8: per-stone weights sum to the total weight for every pair; V9: the
    // source NAME's Ct.Tw. figure equals the summed weight. The slug weight
    // (from the review slug's '{w}ct') must agree with both as well.
    let pairsChecked = 0;
    let singlesChecked = 0;
    let mismatches = 0;
    const mismatchDetails: string[] = [];
    for (const [url, fields] of byUrl) {
      const rawWeight = fields['weight'] ?? '';
      const figures = [...rawWeight.matchAll(/([\d.]+)\s*Ct\./gi)].map((m) => m[1] ?? '');
      if (figures.length === 2) {
        pairsChecked += 1;
        const sumMilli = caratSumMilli(figures);
        const nameFigure = /(\d+\.\d+)Ct\.Tw\./i.exec((bySkuUrl.get(url)?.name ?? ''));
        const slugFigure = /(\d+\.\d+)ct-/i.exec(url);
        if (nameFigure === null || slugFigure === null) {
          mismatches += 1;
          mismatchDetails.push(`missing figure: ${url}`);
          continue;
        }
        if (caratSumMilli([nameFigure[1] ?? '']) !== sumMilli) {
          mismatches += 1;
          mismatchDetails.push(`name ${nameFigure[1]} != sum ${caratText(String(sumMilli / 1_000))}: ${url}`);
        }
        if (caratSumMilli([slugFigure[1] ?? '']) !== sumMilli) {
          mismatches += 1;
          mismatchDetails.push(`slug ${slugFigure[1]} != sum: ${url}`);
        }
      } else if (figures.length === 1) {
        singlesChecked += 1;
      } else {
        mismatches += 1;
        mismatchDetails.push(`weight tokenizes to ${String(figures.length)} figures: ${url}`);
      }
    }
    expect(pairsChecked).toBe(113);
    expect(singlesChecked).toBe(911);
    expect(mismatches).toBe(0);
    expect(mismatchDetails).toEqual([]);
  });
});
