/**
 * Phase 1 Task 7 — the 1,024-record observed-SKU corpus validation
 * (gates V3 and V19; PROJECT_SOURCE_OF_TRUTH.md sections 1.1 and 3.1 Example B;
 * technical_design/33; technical_design/39 evidence ledger "SKU grammar
 * 1,024/1,024").
 *
 * Corpus: `naturalgemstones/reverse_engineered/data/products.jsonl` — the
 * canonical path recorded in docs/evidence/MANIFEST.md entry 5 ("Observed
 * `product.sku` ground truth for the 1,024-record corpus"). Selection rule:
 * every record whose top-level `sku` field is non-empty (1,024 of the 1,245
 * DYO records; the 221 empty-SKU records are the documented failed-fetch set
 * whose derivation is Phase 2 write-path work, NOT part of this gate).
 *
 * Proof performed for every one of the 1,024 records:
 *   1. the OBSERVED sku parses as a canonical SKU string, and
 *   2. the record's URL slug yields the SAME STRUCTURE through Example B's
 *      validated trailing-token derivation (parseSkuFromSlug), and
 *   3. composing the slug-derived structure reproduces the observed SKU text
 *      exactly (gate V19: the derived parser reproduces observed SKUs), and
 *   4. the provenance split holds: the observed value enters as OBSERVED
 *      (parseSourceSku), the slug value as DERIVED (parseDerivedSku,
 *      URL_SLUG, SKU_GRAMMAR_VERSION) — never promoted (SoT 3.1 Example B;
 *      INV-08).
 *
 * The corpus-level aggregates asserted below are [VERIFIED] facts of the SoT
 * (105 cores, 35 gemRefs, 113 pairs / 911 singles, 683 (design, metal)
 * variants, 11 metal codes, 0 duplicate SKUs): a drift means the evidence or
 * the parser changed and this test must fail rather than silently adapt.
 *
 * The whole describe block skips when the source archive is absent (a fresh
 * clone is the documented state per MANIFEST.md; restoring the archive and
 * re-running reproduces the 1,024/1,024 result). The runtime parser itself
 * remains pure — every filesystem access happens here, in the test layer only.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { composeSku, parseSkuFromSlug, parseSkuString, SKU_GRAMMAR_VERSION, type ParsedSku } from './grammar.js';
import { parseDerivedSku } from '../value-objects/derived-sku.js';
import { parseSourceSku } from '../value-objects/source-sku.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const archiveRoot = process.env['NATURALGEMSTONES_ROOT'] ?? path.join(repoRoot, 'naturalgemstones');
const CORPUS_PATH = path.join(archiveRoot, 'reverse_engineered', 'data', 'products.jsonl');
const MANIFEST_PATH = path.join(repoRoot, 'docs', 'evidence', 'MANIFEST.md');

/** Expected SHA-256 of the canonical corpus, extracted from MANIFEST entry 5 (never duplicated here). */
function expectedCorpusDigest(): string | null {
  if (!existsSync(MANIFEST_PATH)) return null;
  for (const line of readFileSync(MANIFEST_PATH, 'utf8').split('\n')) {
    if (line.includes('`naturalgemstones/reverse_engineered/data/products.jsonl`')) {
      const match = /`([0-9a-f]{64})`/.exec(line);
      if (match !== null && match[1] !== undefined) return match[1];
    }
  }
  return null;
}

interface CorpusRecord {
  readonly url: string;
  readonly sku: string;
}

interface CorpusValidation {
  readonly totalRecords: number;
  readonly observed: CorpusRecord[];
  readonly emptySku: number;
  readonly duplicateSkus: string[];
  readonly malformed: string[];
  readonly structuralMismatches: { readonly url: string; readonly observed: ParsedSku | null; readonly derived: ParsedSku | null }[];
  readonly compositionMismatches: { readonly url: string; readonly composed: string; readonly observed: string }[];
  readonly provenancePairs: { readonly observedSku: string; readonly derivedSku: string }[];
  readonly distinctCores: Set<string>;
  readonly distinctRefs: Set<string>;
  readonly distinctMetals: Set<string>;
  readonly distinctVariants: Set<string>;
  readonly pairCount: number;
  readonly singleCount: number;
}

/** Reads, selects and validates the corpus in ONE deterministic pass. */
function validateCorpus(): CorpusValidation | null {
  if (!existsSync(CORPUS_PATH)) return null;
  const digest = expectedCorpusDigest();
  const raw = readFileSync(CORPUS_PATH, 'utf8');
  if (digest !== null) {
    // Manifest cross-check BEFORE any parsing: the gate validates the artifact
    // MANIFEST.md records, not whatever happens to sit at the path.
    const actualDigest = createHash('sha256').update(raw).digest('hex');
    if (actualDigest !== digest) {
      throw new Error(`corpus integrity failure: products.jsonl sha256 ${actualDigest} != MANIFEST entry 5 digest ${digest}`);
    }
  }

  const records: CorpusRecord[] = [];
  let totalRecords = 0;
  let emptySku = 0;
  for (const line of raw.split('\n')) {
    if (line.trim().length === 0) continue;
    totalRecords += 1;
    const parsed: unknown = JSON.parse(line) as unknown;
    const record = parsed as { url?: unknown; sku?: unknown };
    const url = record.url;
    const sku = record.sku;
    if (typeof url !== 'string' || typeof sku !== 'string') {
      throw new Error(`malformed corpus record shape at line ${totalRecords}`);
    }
    if (sku.trim().length === 0) {
      emptySku += 1;
      continue;
    }
    records.push({ url, sku });
  }

  const seenSkus = new Set<string>();
  const duplicateSkus: string[] = [];
  for (const record of records) {
    if (seenSkus.has(record.sku)) duplicateSkus.push(record.sku);
    seenSkus.add(record.sku);
  }

  const malformed: string[] = [];
  const structuralMismatches: CorpusValidation['structuralMismatches'][number][] = [];
  const compositionMismatches: CorpusValidation['compositionMismatches'][number][] = [];
  const provenancePairs: CorpusValidation['provenancePairs'] = [];
  const distinctCores = new Set<string>();
  const distinctRefs = new Set<string>();
  const distinctMetals = new Set<string>();
  const distinctVariants = new Set<string>();
  let pairCount = 0;
  let singleCount = 0;

  for (const record of records) {
    const observedParsed = parseSkuString(record.sku);
    const slug = record.url.split('/').pop() ?? '';
    const derivedParsed = parseSkuFromSlug(slug);

    if (observedParsed === null || derivedParsed === null) {
      malformed.push(record.sku);
      continue;
    }

    // Structural equality: same family, same setting core, same metal, same
    // gemstone reference and kind.
    if (observedParsed.family !== derivedParsed.family) {
      structuralMismatches.push({ url: record.url, observed: observedParsed, derived: derivedParsed });
      continue;
    }
    if (observedParsed.family === 'READY_MADE' || derivedParsed.family === 'READY_MADE') continue;

    if (
      observedParsed.sku.settingCore !== derivedParsed.sku.settingCore ||
      observedParsed.sku.metalCode !== derivedParsed.sku.metalCode ||
      observedParsed.sku.gemRef !== derivedParsed.sku.gemRef
    ) {
      structuralMismatches.push({ url: record.url, observed: observedParsed, derived: derivedParsed });
      continue;
    }
    if (
      observedParsed.family === 'CONFIGURED' &&
      derivedParsed.family === 'CONFIGURED' &&
      (observedParsed.gemstone.kind !== derivedParsed.gemstone.kind ||
        observedParsed.gemstone.gemRef !== derivedParsed.gemstone.gemRef)
    ) {
      structuralMismatches.push({ url: record.url, observed: observedParsed, derived: derivedParsed });
      continue;
    }

    // Gate V19: composing the slug-derived structure reproduces the observed
    // SKU text exactly.
    const composed = composeSku({
      settingCore: derivedParsed.sku.settingCore,
      metalCode: derivedParsed.sku.metalCode,
      ...(derivedParsed.sku.gemRef !== undefined ? { gemRef: derivedParsed.sku.gemRef } : {}),
    });
    if (composed !== record.sku) {
      compositionMismatches.push({ url: record.url, composed, observed: record.sku });
      continue;
    }

    // Provenance hold: observed stays OBSERVED; the slug value stays DERIVED.
    provenancePairs.push({
      observedSku: parseSourceSku(record.sku),
      derivedSku: parseDerivedSku(composed, {
        method: 'URL_SLUG',
        parserVersion: SKU_GRAMMAR_VERSION,
        confidence: 1,
      }).sku,
    });

    if (observedParsed.family === 'CONFIGURED') {
      const { settingCore, metalCode } = observedParsed.sku;
      distinctCores.add(settingCore);
      distinctMetals.add(metalCode);
      distinctVariants.add(`${settingCore}:${metalCode}`);
      distinctRefs.add(observedParsed.gemstone.gemRef);
      if (observedParsed.gemstone.kind === 'PAIR') pairCount += 1;
      else singleCount += 1;
    }
  }

  return {
    totalRecords,
    observed: records,
    emptySku,
    duplicateSkus,
    malformed,
    structuralMismatches,
    compositionMismatches,
    provenancePairs,
    distinctCores,
    distinctRefs,
    distinctMetals,
    distinctVariants,
    pairCount,
    singleCount,
  };
}

const result = validateCorpus();

describe.skipIf(result === null)('SKU grammar — 1,024-record observed-SKU corpus (gates V3 + V19)', () => {
  it('the corpus artifact matches MANIFEST entry 5 (SHA-256 provenance cross-check)', () => {
    expect(expectedCorpusDigest()).not.toBeNull();
    const actualDigest = createHash('sha256').update(readFileSync(CORPUS_PATH, 'utf8')).digest('hex');
    expect(actualDigest).toBe(expectedCorpusDigest());
  });

  it('selection rule: 1,245 DYO records, 1,024 with an observed sku, 221 empty (the documented failed-fetch set)', () => {
    expect(result?.totalRecords).toBe(1245);
    expect(result?.observed.length).toBe(1024);
    expect(result?.emptySku).toBe(221);
  });

  it('parses 1,024 / 1,024 with 0 malformed records', () => {
    expect(result?.malformed).toEqual([]);
    expect((result?.observed.length ?? 0) - (result?.malformed.length ?? 0)).toBe(1024);
  });

  it('0 structural mismatches (V3): slug-derived structure equals observed structure for every record', () => {
    expect(result?.structuralMismatches).toEqual([]);
  });

  it('0 composition mismatches (V19): composing the derived structure reproduces each observed SKU', () => {
    expect(result?.compositionMismatches).toEqual([]);
  });

  it('0 duplicate observed SKUs; every URL distinct', () => {
    expect(result?.duplicateSkus).toEqual([]);
    expect(new Set(result?.observed.map((r) => r.url)).size).toBe(1024);
  });

  it('corpus-level [VERIFIED] aggregates hold (SoT 1.1): 105 cores, 35 gemRefs, 11 metals, 683 variants', () => {
    expect(result?.distinctCores.size).toBe(105);
    expect(result?.distinctRefs.size).toBe(35);
    expect(result?.distinctMetals.size).toBe(11);
    expect(result?.distinctVariants.size).toBe(683);
  });

  it('pair/single split: 113 PR pairs and 911 K singles', () => {
    expect(result?.pairCount).toBe(113);
    expect(result?.singleCount).toBe(911);
    expect((result?.pairCount ?? 0) + (result?.singleCount ?? 0)).toBe(1024);
  });

  it('the DYO corpus uses exactly the 11 metal codes the SoT evidence records', () => {
    expect([...(result?.distinctMetals ?? [])].sort()).toEqual(
      ['PT', 'R14', 'R18', 'W14', 'W18', 'WY14', 'WY18', 'Y14', 'Y18', 'YW14', 'YW18'].sort(),
    );
    // R10 (and W10/Y10/SL within the DYO set) are absent from the corpus yet
    // remain valid grammar symbols — covered by the parser unit tests.
  });

  it('provenance holds for all 1,024: observed stays OBSERVED, slug-derived stays DERIVED (INV-08 discipline)', () => {
    expect(result?.provenancePairs.length).toBe(1024);
    for (const pair of result?.provenancePairs ?? []) {
      expect(pair.observedSku).toBe(pair.derivedSku);
      expect(typeof pair.observedSku).toBe('string');
    }
  });
});

/** Exposed for a standalone re-run report without a test runner: still deterministic. */
export const corpusValidationSummary = {
  available: result !== null,
  totalRecords: result?.totalRecords ?? 0,
  observed: result?.observed.length ?? 0,
  parsed: result === null ? 0 : result.observed.length - result.malformed.length,
  mismatches: (result?.structuralMismatches.length ?? 0) + (result?.compositionMismatches.length ?? 0),
  malformed: result?.malformed.length ?? 0,
  emptySku: result?.emptySku ?? 0,
  duplicateSkus: result?.duplicateSkus.length ?? 0,
  grammarVersion: SKU_GRAMMAR_VERSION,
};
