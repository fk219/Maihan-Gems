/**
 * tools/migrate — stage "parse-slugs" (Phase 2 Global Task 12 = plan
 * detailed tasks 4+5, epic E2.1/E2.2).
 *
 * Reads the VERIFY-verified `urls.jsonl`, classifies every row into the five
 * commerce URL families, parses the slug fields with a per-field confidence
 * ledger, and writes `staging_parsed_urls`. Family census must RECONCILE
 * EXACTLY against the SoT §2.1/§4.2 counts (gate V14) and parse rates must
 * be 100% for the loose-stone and pair families (V1, V2).
 *
 * Conflicts land in `staging_conflicts` unresolved: the misfiled ready-made
 * jewellery slugs, the shared-PR pairs, and the non-K slug shape.
 */
import type { StageContext } from './context.js';
import { jsonLines } from './context.js';
import { buildOriginVocabulary, classifyUrl, URL_FAMILIES, type ParsedUrl } from './parse-slug.js';

/** SoT §4.2 verified commerce counts (URLs). */
export const EXPECTED_FAMILY_COUNTS = Object.freeze({
  DYO: 9_812,
  SETTING: 10_772, // item slugs + the bracelet/mens index routes carry the settings-shape routes per the measured corpus
  LOOSE_STONE: 19_665,
  STONE_PAIR: 3_077,
  READY_MADE: 88,
} as const);

/** The SoT §4.2 distinct-entity targets used by V14's second half. */
export const EXPECTED_ENTITY_COUNTS = Object.freeze({
  LOOSE_STONE_REFS: 19_665,
  STONE_PAIR_REFS: 3_072,
  DESIGN_CORES: 951,
  SETTING_SKUS: 10_349,
  DYO_URLS: 9_812,
  READY_MADE_ITEMS: 88,
} as const);

export type FamilyCensus = Record<string, number>;

/** The authoritative corpus gate values the RUNNER injects on a real manifest. */
export const CORPUS_EXPECTATIONS = Object.freeze({ families: EXPECTED_FAMILY_COUNTS, spine: 44_218 });

/** Execute the parse stage: classify all URLs, write staging, assert V1/V2/V14.
 *
 * `expected` — the CORPUS gate expectations (SoT §4.2). When omitted the
 * stage verifies STRUCTURE only (census partition, per-family parse rate),
 * so disposable-fixture tests can run the chain on a tiny manifest; the
 * runner injects the authoritative expectations when it runs against the
 * REAL manifest (minManifestArtifacts >= 13). */
export async function runParseSlugs(ctx: StageContext, expected?: { families: typeof EXPECTED_FAMILY_COUNTS; spine: number }): Promise<ParseStageResult> {
  const path = ctx.artifactPath('urls.jsonl');

  // Pass 1: gather the paths for the deterministic origin vocabulary.
  const paths: string[] = [];
  for await (const { record } of jsonLines(path)) {
    const url = record['url'];
    if (typeof url !== 'string') {
      throw new Error('parse-slugs: urls.jsonl record has no url value (the stage after extract must see the same spine)');
    }
    paths.push(url);
  }
  const originVocabulary = buildOriginVocabulary(paths);

  // Pass 2: classify + parse + row-list.
  const rows: ParsedUrl[] = [];
  for (const url of paths) {
    rows.push(Object.freeze(classifyUrl(url, originVocabulary)));
  }
  if (rows.length !== paths.length) {
    throw new Error(`parse-slugs: parsed ${rows.length} URLs, expected ${paths.length}`);
  }

  // Census partition: every row is in exactly one family.
  const census: FamilyCensus = Object.fromEntries(URL_FAMILIES.map((f) => [f, 0]));
  for (const row of rows) {
    const current = census[row.family];
    if (current === undefined) {
      throw new Error(`parse-slugs: classifier produced an out-of-enum family '${row.family}'`);
    }
    census[row.family] = current + 1;
  }
  const total = Object.values(census).reduce((a, b) => a + b, 0);
  if (total !== paths.length) {
    throw new Error(`parse-slugs: family census sums to ${total}, the record count must equal ${paths.length}`);
  }

  // Parse-rate gates V1/V2 (family-wide anchors exhausted).
  const loose = rows.filter((r) => r.family === 'LOOSE_STONE');
  const pair = rows.filter((r) => r.family === 'STONE_PAIR');
  const looseParsed = loose.filter((r) => r.fields.gemRefDerived?.value !== null);
  const pairParsed = pair.filter((r) => r.fields.gemRefDerived?.value !== null);
  if (looseParsed.length !== loose.length) {
    throw new Error(`parse-slugs: gate V1 FAILED — loose-stone parse rate ${looseParsed.length}/${loose.length}, all must parse`);
  }
  if (pairParsed.length !== pair.length) {
    throw new Error(`parse-slugs: gate V2 FAILED — pair parse rate ${pairParsed.length}/${pair.length}, all must parse`);
  }

  // Entity subtotals (V14 second half; design-core / SKU totals strengthen
  // the settings family and the shared-PR count is the conflict ledger's).
  const looseRefs = new Set(loose.map((r) => String(r.fields.gemRefDerived?.value)));
  const pairRefs = new Map<string, string[]>();
  for (const row of pair) {
    const ref = String(row.fields.gemRefDerived?.value);
    const prior = pairRefs.get(ref);
    if (prior === undefined) pairRefs.set(ref, [row.sourceUrl]);
    else prior.push(row.sourceUrl);
  }
  const sharedRefs = [...pairRefs.entries()].filter(([, urls]) => urls.length > 1);
  const settingRows = rows.filter((r) => r.family === 'SETTING');
  const settingSkus = new Set(settingRows.map((r) => String(r.fields.derivedSku?.value ?? '')));
  const designCores = new Set(settingRows.map((r) => String(r.fields.designCode?.value ?? '').replace(/^(JS\d+).*/, '$1')));
  const readyMade = rows.filter((r) => r.family === 'READY_MADE');

  const censusMismatches: string[] = [];
  if (expected !== undefined) {
    if (loose.length !== expected.families.LOOSE_STONE) censusMismatches.push(`loose rows ${loose.length} != ${expected.families.LOOSE_STONE}`);
    if (pair.length !== expected.families.STONE_PAIR) censusMismatches.push(`pair rows ${pair.length} != ${expected.families.STONE_PAIR}`);
    if (settingRows.length !== expected.families.SETTING) censusMismatches.push(`setting rows ${settingRows.length} != ${expected.families.SETTING}`);
    if (rows.filter((r) => r.family === 'DYO').length !== expected.families.DYO) censusMismatches.push(`dyo rows != ${expected.families.DYO}`);
    if (readyMade.length !== expected.families.READY_MADE) censusMismatches.push(`ready-made ${readyMade.length} != ${expected.families.READY_MADE}`);
  }
  if (expected !== undefined) {
    if (looseRefs.size !== EXPECTED_ENTITY_COUNTS.LOOSE_STONE_REFS) {
      censusMismatches.push(`loose refs ${looseRefs.size} != ${EXPECTED_ENTITY_COUNTS.LOOSE_STONE_REFS}`);
    }
    if (pairRefs.size !== EXPECTED_ENTITY_COUNTS.STONE_PAIR_REFS) {
      censusMismatches.push(`pair refs ${pairRefs.size} != ${EXPECTED_ENTITY_COUNTS.STONE_PAIR_REFS}`);
    }
    if (designCores.size !== EXPECTED_ENTITY_COUNTS.DESIGN_CORES) {
      censusMismatches.push(`design cores ${designCores.size} != ${EXPECTED_ENTITY_COUNTS.DESIGN_CORES}`);
    }
    if (settingSkus.size !== EXPECTED_ENTITY_COUNTS.SETTING_SKUS) {
      censusMismatches.push(`setting SKUs ${settingSkus.size} != ${EXPECTED_ENTITY_COUNTS.SETTING_SKUS}`);
    }
    if (readyMade.length !== EXPECTED_ENTITY_COUNTS.READY_MADE_ITEMS) {
      censusMismatches.push(`ready-made ${readyMade.length} != ${EXPECTED_ENTITY_COUNTS.READY_MADE_ITEMS}`);
    }
  }
  if (censusMismatches.length > 0) {
    throw new Error(`parse-slugs: gate V14 FAILED — ${censusMismatches.join('; ')}`);
  }

  // Write stale rows: parse output + per-field evidence ledger.
  await ctx.db.query('DELETE FROM staging_conflicts WHERE import_batch_id = $1', [ctx.importBatchId]);
  // Conflict ledger reset happens before writing (stage-owned reset).
  // corpus-totals check is the runner's corpus gate; fixture manifests run
  // with structural verification only.
  const write = await writeParsedRows(ctx, rows);
  const sharedRows = await writePairConflicts(ctx, sharedRefs);
  const misfiled = rows.filter((r) => r.family === 'UNKNOWN');
  const misfiledRows = await writeMisfiledConflicts(ctx, misfiled);
  const conflicts = sharedRows + misfiledRows;

  return { urlsParsed: rows.length, census, staged: write, sharedPairRefs: sharedRefs.length, conflicts };
}


export interface ParseStageResult {
  readonly urlsParsed: number;
  readonly census: FamilyCensus;
  readonly staged: { seen: number; accepted: number };
  readonly sharedPairRefs: number;
  readonly conflicts: number;
}

/** Upsert all parsed rows. Natural key (import_batch_id, source_url). */
async function writeParsedRows(ctx: StageContext, rows: readonly ParsedUrl[]): Promise<{ seen: number; accepted: number }> {
  let seen = 0;
  let accepted = 0;
  const BATCH = 1_000;
  for (let start = 0; start < rows.length; start += BATCH) {
    const batch = rows.slice(start, start + BATCH);
    const values: string[] = [];
    const params: unknown[] = [];
    for (const row of batch) {
      const f = row.fields;
      const num = (fieldEvidenceVal: { value: unknown; evidence: string } | null, cast: 'ct' | 'plain'): unknown => {
        if (fieldEvidenceVal === null || fieldEvidenceVal.value === null) return null;
        const v = fieldEvidenceVal.value;
        return cast === 'ct' ? String(Number(v).toFixed(3)) : v;
      };
      const base = params.length;
      params.push(
        ctx.importBatchId,
        row.sourceUrl,
        row.family,
        row.routeDepth,
        f.variety?.value ?? null,
        f.colour?.value ?? null,
        f.form,
        num(f.stoneWeightCt, 'ct'),
        f.origin?.value ?? null,
        f.shape?.value ?? null,
        f.cut?.value ?? null,
        f.jewelleryType?.value ?? null,
        f.designCode?.value ?? null,
        f.metalCode?.value ? String(f.metalCode.value).toUpperCase() : null,
        f.settingStyle?.value ?? null,
        f.gemRefDerived?.value ?? null,
        f.gemRefObserved?.value ?? null,
        f.derivedSku?.value ?? null,
        row.confidence,
        JSON.stringify(fieldLedger(f)),
        'EXTRACTED',
      );
      values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16}, $${base + 17}, $${base + 18}, $${base + 19}, $${base + 20}, $${base + 21})`);
    }
    const result = await ctx.db.query(
      `INSERT INTO staging_parsed_urls
        (import_batch_id, source_url, url_family, route_depth, variety_slug, colour_slug, form_slug,
         stone_weight_ct, origin_slug, shape_slug, cut_slug, jewellery_type_slug, design_code,
         metal_code, setting_style, gem_ref_derived, gem_ref_observed, derived_sku,
         parse_confidence, parse_warnings, evidence_status)
       VALUES ${values.join(', ')}
       ON CONFLICT (import_batch_id, source_url) DO NOTHING`,
      params,
    );
    accepted += result.rowCount ?? 0;
    seen += batch.length;
  }
  return { seen, accepted };
}

/**
 * The per-field evidence ledger (parse_warnings entry set): every parsed
 * field's structured value + confidence + evidence status, so each derived
 * value is traceable without the parent module.
 */
function fieldLedger(f: ParsedUrl['fields']): object {
  const ledger: Record<string, unknown> = {};
  for (const [name, fieldEvidenceVal] of Object.entries(f)) {
    if (fieldEvidenceVal !== null) {
      ledger[name] = { value: fieldEvidenceVal.value, confidence: fieldEvidenceVal.confidence, evidence: fieldEvidenceVal.evidence, ...(fieldEvidenceVal.warning !== undefined ? { warning: fieldEvidenceVal.warning } : {}) };
    } else {
      ledger[name] = { value: null, confidence: 0, evidence: 'UNKNOWN' };
    }
  }
  return ledger;
}

/**
 * The spec-level known conflicts of the parse stage: pair URLs sharing a PR
 * id (SoT §33.6, manual review, unresolved) and the misfiled jewellery slugs
 * (family UNKNOWN rows). Each is recorded unresolved.
 */
async function writePairConflicts(ctx: StageContext, sharedRefs: readonly (readonly [string, readonly string[]])[]): Promise<number> {
  let rows = 0;
  for (const [ref, urls] of sharedRefs) {
    for (let i = 0; i < urls.length; i += 1) {
      const other = urls[i === 0 ? 1 : 0];
      await ctx.db.query(
        `INSERT INTO staging_conflicts (import_batch_id, entity_kind, entity_ref, field_name, value_a, source_url_a, value_b, source_url_b, resolution, resolved_by, resolved_at)
         VALUES ($1, 'GEMSTONE_PAIR', $2, 'gem_ref', $3, $4, $3, $5, NULL, NULL, NULL)`,
        [ctx.importBatchId, ref, ref, urls[i], other ?? null],
      );
      rows += 1;
    }
  }
  return rows;
}

/**
 * The misfiled ready-mades (SoT §33.6 "314 stone URLs ending -J#####;
 * likely misfiled; quarantine"): every family-UNKNOWN row gets ONE
 * unresolved conflict row naming the URL and the census delta (measured
 * census vs the documented 314), never auto-resolved.
 */
async function writeMisfiledConflicts(ctx: StageContext, misfiled: readonly ParsedUrl[]): Promise<number> {
  const documentedNote = 'documented ready-made family = /{variety}-rings/{slug}-J##### (SoT §13.1)';
  let rows = 0;
  for (const row of misfiled) {
    const measuredNote = `measured this run: ${misfiled.length} family-UNKNOWN jewellery slugs (SoT §33.6 documented 314; delta reported, not silently reconciled)`;
    await ctx.db.query(
      `INSERT INTO staging_conflicts (import_batch_id, entity_kind, entity_ref, field_name, value_a, source_url_a, value_b, source_url_b, resolution, resolved_by, resolved_at)
       VALUES ($1, 'URL_FAMILY', $2, 'url_family', $3, $2, $4, NULL, NULL, NULL, NULL)`,
      [ctx.importBatchId, row.sourceUrl, measuredNote, documentedNote],
    );
    rows += 1;
  }
  return rows;
}
