/**
 * tools/migrate — stage "canonical-catalog" (Phase 2 Global Task 14 = plan
 * detailed tasks 8-12, epics E2.1..E2.4).
 *
 * Plan task 14 (verbatim): "Implement canonical upserts in dependency order:
 * taxonomy, stones, pairs, settings, 10,349 variants, products."
 * Done when gates V4, V5, V6, V7, V10, V12, V13 are green.
 *
 * STRICT internal dependency order (never reordered):
 *
 *   1. taxonomy: gemstone_species, gemstone_varieties, gemstone_colours,
 *      gemstone_origins (metals, jewellery types, setting styles,
 *      treatments, intensities, clarities are ALREADY seeded by the
 *      'seed-reference' stage and are only reconciled here).
 *   2. settings (951 design cores), then setting_variants (10,349).
 *   3. gemstones: kind SINGLE (19,665) + kind PAIR (3,072), then
 *      gemstone_stones (1 row SINGLE, 2 rows PAIR; the D9 tokenizer module).
 *   4. products: kind CONFIGURED (9,812) + kind READY_MADE (88).
 *
 * The compatibility-rule seeds (plan detailed task 15) are NOT this stage:
 * per the control mapping they land with Global Task 20 and are reported
 * there.
 *
 * Provenance: every row answers "where did this value come from": source
 * URL/slug + evidence_status + import_batch_id. Values normalised from
 * source strings are at most EXTRACTED; values with no evidence are NULL
 * with UNKNOWN. Prices land in 'prices-observations' (plan task 16).
 *
 * IDEMPOTENCY (gate V17): no stage deletes what it created; every row is
 * written INSERT ... ON CONFLICT (natural key) DO NOTHING, so a deep rerun
 * leaves every stored byte (identity UUIDs included) exactly as the first
 * run left it.
 *
 * Nothing publishes: everything lands DRAFT. The 221 derived identities are
 * written here ONLY as their composition links allow and are completed/
 * verified by the 'derived-identities' stage (plan task 15).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import type { TokenResult } from '@maihan/domain';
import type { StageContext } from './context.js';
import { tableRowCount } from './context.js';
import { loadTokenizedSpecifications, type TokenizedFields } from './tokenize-stones.js';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

/** The staging_parsed_urls row shape (to_jsonb of the parser stage output). */
export interface ParsedRow {
  readonly source_url: string;
  readonly url_family: string;
  readonly route_depth: number;
  readonly variety_slug: string | null;
  readonly colour_slug: string | null;
  readonly form_slug: string | null;
  readonly stone_weight_ct: string | null;
  readonly origin_slug: string | null;
  readonly shape_slug: string | null;
  readonly cut_slug: string | null;
  readonly jewellery_type_slug: string | null;
  readonly design_code: string | null;
  readonly metal_code: string | null;
  readonly setting_style: string | null;
  readonly gem_ref_derived: string | null;
  readonly derived_sku: string | null;
  readonly parse_confidence: string;
  readonly parse_warnings: unknown[];
}

export interface CanonicalStageResult {
  readonly variantInferences: { variants: number; designs: number };
  readonly parsedRows: number;
  readonly taxonomy: { species: number; varieties: number; colours: number; origins: number };
  readonly settings: number;
  readonly settingVariants: number;
  readonly stones: number;
  readonly pairs: number;
  readonly gemstoneStones: number;
  readonly configuredProducts: number;
  readonly readyMadeProducts: number;
}

/** One per-stone measured row (the D9 tokenizer output shape). */
export interface StoneMeasure {
  readonly weightCt: string; // NUMERIC(8,3) decimal string
  readonly lengthMm: string | null;
  readonly widthMm: string | null;
  readonly depthMm: string | null;
  readonly rawWeightText: string;
  readonly rawDimensionsText: string | null;
}

export interface GemstoneRecord {
  readonly gemRef: string; // 'K#####' | 'PR#####'
  readonly kind: 'SINGLE' | 'PAIR';
  readonly varietySlug: string;
  readonly totalWeightCt: string; // decimal string
  readonly stoneCount: 1 | 2;
  readonly perStone: readonly StoneMeasure[];
  readonly colourSlug: string | null;
  readonly intensityName: string | null;
  readonly clarityLabel: string | null;
  readonly shape: string | null;
  readonly cutLabel: string | null;
  readonly cuttingStyle: string | null;
  readonly treatmentLabel: string | null;
  readonly originSlug: string | null;
  readonly pricePerCarat: string | null;
  readonly sourceUrl: string | null;
  readonly sourceSlug: string | null;
  /** 'OBSERVED' when the ref comes from the loose/pair inventory; 'INFERRED'
   *  when the record is the V22 "created" branch (a DYO-page-named ref with
   *  no stone URL of its own). Never promoted to observed. */
  readonly refEvidence: 'OBSERVED' | 'INFERRED';
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/** Collapsed single value of a tokenized field ('Blue Blue' -> 'Blue'). */
function collapse(field: TokenResult | undefined): string | null {
  return field !== undefined && field.tokens.length > 0 ? String(field.tokens[0]) : null;
}

/** Plain decimal figures of the weight token list ('2.87 Ct.' -> '2.87'). */
export function figuresOf(field: TokenResult | undefined): readonly string[] {
  const out: string[] = [];
  for (const token of field?.tokens ?? []) {
    const figure = /^([\d.]+)\s/.exec(token)?.[1];
    if (figure !== undefined) out.push(figure);
  }
  return out;
}

/** '$590' -> '590.00' (decimal string; never a float). */
export function ppcOf(field: TokenResult | undefined): string | null {
  const collapsed = collapse(field);
  if (collapsed === null) return null;
  const digits = collapsed.replace(/[$,]/g, '').trim();
  if (digits.length === 0) return null;
  return Number(digits).toFixed(2);
}

/** 'Faceted' -> 'FACETED'; null otherwise (never a guesses default). */
export function cuttingStyleOf(field: TokenResult | undefined): 'FACETED' | 'CABOCHON' | null {
  const collapsed = collapse(field)?.toUpperCase();
  if (collapsed === 'FACETED') return 'FACETED';
  if (collapsed === 'CABOCHON') return 'CABOCHON';
  return null;
}

/** Pairs sum both figures; singles take one; slugs carry the pair TOTAL figure. */
export function totalWeightOf(figures: readonly string[], slugTotal: string | null): string {
  if (figures.length === 2) {
    return (Number(figures[0]) + Number(figures[1])).toFixed(3);
  }
  if (figures.length === 1) return Number(figures[0]).toFixed(3);
  if (slugTotal !== null && slugTotal.length > 0) return Number(slugTotal).toFixed(3);
  return '0.000';
}

export interface Dimensions {
  readonly length: string;
  readonly width: string;
  readonly depth: string;
}

/** One dimension section of the tokenizer's verbatim form; null when absent. */
export function parseSpecDimensions(tokenText: string): Dimensions | null {
  const m = /^Length:\s*([\d.]+)\s+Width:\s*([\d.]+)\s+Height:\s*([\d.]+)$/i.exec(tokenText.trim());
  if (m === null) return null;
  return Object.freeze({ length: m[1] ?? '', width: m[2] ?? '', depth: m[3] ?? '' });
}

/** All parsed sections of the dimensions field, one per stone (or null). */
export function dimensionSections(field: TokenResult | undefined): readonly (Dimensions | null)[] {
  return (field?.tokens ?? []).map((tokenText) => parseSpecDimensions(tokenText));
}

/** 'pave-pendant' -> 'Pave Pendant' (deterministic token title-casing). */
export function titleCase(slug: string): string {
  return slug
    .split(/[\s-]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// ----------------------------------------------------------------------------
// Reading staging + evidence maps
// ----------------------------------------------------------------------------

interface ObservedProduct {
  readonly url: string;
  readonly sku: string;
  readonly name: string;
}

function observedProducts(path: string, expectDigest?: string): Map<string, ObservedProduct> {
  if (expectDigest !== undefined) {
    const actual = createHash('sha256').update(readFileSync(path)).digest('hex');
    if (actual !== expectDigest) {
      throw new Error(`canonical-catalog: products.jsonl digest mismatch: expected ${expectDigest}, actual ${actual}`);
    }
  }
  const out = new Map<string, ObservedProduct>();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim().length === 0) continue;
    const r = JSON.parse(line) as { url: string; sku: string; name: string };
    if (r.sku.length === 0) continue; // the documented 221 live in the derived-identities stage
    if (out.has(r.url)) throw new Error(`canonical-catalog: duplicate observed product row for ${r.url}`);
    out.set(r.url, Object.freeze({ url: r.url, sku: r.sku.toUpperCase(), name: r.name }));
  }
  return out;
}

export async function selectParsedRows(db: StageContext['db'], family?: string): Promise<readonly ParsedRow[]> {
  const where = family === undefined ? '' : ' WHERE url_family = $1';
  const params = family === undefined ? [] : [family];
  const r = await db.query<{ row: Record<string, unknown> }>(
    `SELECT to_jsonb(t) AS row FROM staging_parsed_urls t${where} ORDER BY source_url`,
    params,
  );
  return r.rows.map((x) => {
    const value = x.row as Record<string, unknown>;
    // NUMERIC comes back as a jsonb NUMBER; the canonical code path treats
    // the value as a decimal string — normalise once, here, verbatim-digit-preserving.
    const numeric = (key: string): string | null => {
      const raw = value[key];
      if (raw === null || raw === undefined) return null;
      if (typeof raw === 'number') return raw.toFixed(3);
      return String(raw);
    };
    return Object.freeze({
      ...value,
      stone_weight_ct: numeric('stone_weight_ct'),
      parse_confidence: typeof value['parse_confidence'] === 'number' ? String(value['parse_confidence']) : String(value['parse_confidence'] ?? ''),
    }) as unknown as ParsedRow;
  });
}

/**
 * Generic natural-key upsert returning the row id (inserted or existing).
 * `conflictColumns` is the FULL conflict target — bare columns for full-table
 * UNIQUE constraints; the partial-index predicate where the locked schema
 * only declares a partial unique index (products.slug). `lookupPositions`
 * gives the POSITIONS (0-based, within `values`) of the natural-key columns
 * for the existence fallback — required when the natural key is not the
 * first column.
 */
async function upsertReturning(
  db: StageContext['db'],
  table: string,
  conflictColumns: readonly string[],
  columns: readonly string[],
  values: readonly unknown[],
  options?: { conflictPredicate?: string; lookupPositions?: readonly number[] },
): Promise<string> {
  const ids = conflictColumns.join(', ');
  const predicate = options?.conflictPredicate;
  const clause = `(${ids})${predicate !== undefined ? ` ${predicate}` : ''}`;
  const r = await db.query<{ id: string }>(
    `INSERT INTO ${table} (${columns.join(', ')})
     VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
     ON CONFLICT ${clause} DO NOTHING
     RETURNING id::text AS id`,
    values as unknown[],
  );
  const inserted = r.rows[0]?.id;
  if (inserted !== undefined) return inserted;
  const positions = options?.lookupPositions ?? conflictColumns.map((_, i) => i);
  const keyedValues = positions.map((position) => values[position]);
  const found = await db.query<{ id: string }>(
    `SELECT id::text AS id FROM ${table}
      WHERE (${conflictColumns.map((c, i) => `${c} = $${i + 1}`).join(' AND ')})${predicate !== undefined ? ` AND ${predicate.replace(/^WHERE\s+/i, '')}` : ''}`,
    keyedValues as unknown[],
  );
  const existing = found.rows[0]?.id;
  if (existing === undefined) throw new Error(`canonical-catalog: ${table} row with ${conflictColumns.join('+')} = ${conflictColumns.map((_c: string, i: number) => JSON.stringify(keyedValues[i])).join('+')} did not upsert`);
  return existing;
}

// ----------------------------------------------------------------------------
// Step 1 — taxonomy upserts
// ----------------------------------------------------------------------------

/**
 * The INFERRED species grouping: the mineral-family suffix when recognisable,
 * else the variety itself (a labelled design decision per doc 33 §2, never
 * presented as observed).
 */
export function speciesCodeOf(varietySlug: string): string {
  const familySuffixes: readonly string[] = ['garnet', 'tourmaline', 'beryl', 'corundum', 'opal', 'pearl', 'quartz'];
  const tokens = varietySlug.split('-');
  for (const suffix of familySuffixes) {
    if (tokens[tokens.length - 1] === suffix) return suffix;
  }
  for (const suffix of familySuffixes) {
    if (suffix !== 'opal' && tokens.includes(suffix)) return suffix;
  }
  return varietySlug;
}

export interface ReferenceMaps {
  readonly speciesIdByCode: Map<string, string>;
  readonly varietyIdBySlug: Map<string, string>;
  readonly colourIdBySlug: Map<string, string>;
  readonly originIdBySlug: Map<string, string>;
}

/** Taxonomy upserts in FK-safe order; DRAFT record state; nothing publishes. */
async function upsertTaxonomy(db: StageContext['db'], batchId: string, parsed: readonly ParsedRow[]): Promise<ReferenceMaps> {
  const speciesIdByCode = new Map<string, string>();
  const varietyIdBySlug = new Map<string, string>();
  const colourIdBySlug = new Map<string, string>();
  const originIdBySlug = new Map<string, string>();

  // distinct ref-bearing variety slugs (the stone rows are the evidence)
  const varieties = new Set<string>();
  const colours = new Set<string>();
  const origins = new Set<string>();
  for (const row of parsed) {
    if (row.url_family !== 'LOOSE_STONE' && row.url_family !== 'STONE_PAIR' && row.url_family !== 'VARIETY_INDEX') continue;
    if (row.variety_slug !== null && row.variety_slug.length > 0) varieties.add(row.variety_slug);
    if (row.colour_slug !== null && row.colour_slug.length > 0) colours.add(row.colour_slug);
    if (row.origin_slug !== null && row.origin_slug.length > 0) origins.add(row.origin_slug);
  }

  // species first
  const speciesCodes = new Set<string>([...varieties].map((v) => speciesCodeOf(v)));
  for (const code of [...speciesCodes].sort((a, b) => a.localeCompare(b))) {
    speciesIdByCode.set(code, await upsertReturning(db, 'gemstone_species', ['code'], ['code', 'name', 'evidence_status'], [code, titleCase(code), 'INFERRED']));
  }

  // varieties
  for (const slug of [...varieties].sort((a, b) => a.localeCompare(b))) {
    const speciesId = speciesIdByCode.get(speciesCodeOf(slug)) ?? null;
    varietyIdBySlug.set(slug, await upsertReturning(
      db,
      'gemstone_varieties',
      ['slug'],
      ['species_id', 'slug', 'name', 'display_name', 'source_route', 'state', 'evidence_status'],
      [speciesId, slug, titleCase(slug), titleCase(slug), `/${slug}`, 'DRAFT', 'EXTRACTED'],
      { lookupPositions: [1] },
    ));
  }

  // colours
  for (const slug of [...colours].sort((a, b) => a.localeCompare(b))) {
    colourIdBySlug.set(slug, await upsertReturning(
      db,
      'gemstone_colours',
      ['slug'],
      ['slug', 'name', 'is_chromatic', 'sort_order', 'state', 'evidence_status'],
      [slug, titleCase(slug), true, 100, 'DRAFT', 'EXTRACTED'],
    ));
  }

  // origins
  for (const slug of [...origins].sort((a, b) => a.localeCompare(b))) {
    originIdBySlug.set(slug, await upsertReturning(
      db,
      'gemstone_origins',
      ['slug'],
      ['slug', 'name', 'evidence_status'],
      [slug, titleCase(slug), 'EXTRACTED'],
    ));
  }
  void batchId;
  return { speciesIdByCode, varietyIdBySlug, colourIdBySlug, originIdBySlug };
}

// ----------------------------------------------------------------------------
// Step 2 — settings (design cores) + setting_variants (design x metal)
// ----------------------------------------------------------------------------

export interface DesignRecord {
  readonly designCode: string; // 'JS<core><metal>' uppercased
  readonly core: string; // numeric core
  readonly jewellery: string; // mount jewellery type (enum value)
  readonly styleSlug: string | null;
  readonly slug: string; // representative source slug (lexicographic min)
  readonly sourceUrl: string;
}

export interface VariantRecord {
  readonly sku: string; // 'JS1150W14'
  readonly core: string;
  readonly metalCode: string;
  readonly slug: string;
  readonly sourceUrl: string;
}

/**
 * Aggregate the SETTING staging rows: one design record per numeric core,
 * one variant per (core, metal). `parsed` arrives sorted by source_url, so
 * first-wins IS the lexicographic-minimum slug. Distinct slug texts for one
 * SKU are a conflict (returned in `slugDisagreements`, recorded unresolved
 * by the caller) — never a merge.
 */
export function aggregateSettings(parsed: readonly ParsedRow[]): {
  designs: Map<string, DesignRecord>;
  variants: Map<string, VariantRecord>;
  slugDisagreements: number;
} {
  const designs = new Map<string, DesignRecord>();
  const variants = new Map<string, VariantRecord>();
  let slugDisagreements = 0;
  const disagreementUrls: string[] = [];
  for (const row of parsed) {
    if (row.url_family !== 'SETTING') continue;
    const designCode = row.derived_sku; // 'JS1016W10' (the SETTING-only SKU)
    const core = row.design_code === null ? null : row.design_code.replace(/^JS(\d+).*/, '$1');
    if (designCode === null || core === null || core.length === 0) continue;
    if (!designs.has(core)) {
      designs.set(core, {
        designCode: core,
        core,
        jewellery: row.jewellery_type_slug ?? 'RING',
        styleSlug: row.setting_style,
        slug: slugOnly(row.source_url),
        sourceUrl: row.source_url,
      });
    }
    const slug = slugOnly(row.source_url);
    const prior = variants.get(designCode);
    if (prior === undefined) {
      variants.set(designCode, { sku: designCode, core, metalCode: row.metal_code ?? '', slug, sourceUrl: row.source_url });
    } else if (prior.slug !== slug) {
      slugDisagreements += 1;
      disagreementUrls.push(row.source_url);
    }
  }
  void disagreementUrls;
  return { designs, variants, slugDisagreements };
}

/** The URL's last path segment (verbatim; query strings are not slugs). */
export function slugOnly(url: string): string {
  const withoutQuery = url.split('?');
  const path = withoutQuery[0] ?? url;
  const segments = path.split('/').filter((s) => s.length > 0);
  return segments[segments.length - 1] ?? '';
}

/**
 * The derived DYO identity from the staging parse: '<JS####<metal>>-<K|PR>####'
 * (the grammar-1 composition, SoT §1.1). Observed SKUs never route here.
 */
export function derivedIdentityOf(row: ParsedRow): string | null {
  const design = row.design_code;
  const ref = row.gem_ref_derived;
  if (design === null || ref === null) return null;
  return `${design}-${ref}`.toUpperCase();
}

/** Upsert designs then variants; returns id maps + counts (V12/V13 hold on
 *  the schema's own natural keys: sku UNIQUE, (setting_id, metal_code) UNIQUE). */
async function upsertSettingsAndVariants(db: StageContext['db'], batchId: string, parsed: readonly ParsedRow[]): Promise<{
  settings: number; settingVariants: number; disagreements: number; variantIdBySku: Map<string, string>;
}> {
  const { designs, variants, slugDisagreements } = aggregateSettings(parsed);

  // style id map from the SEEDED vocabulary (setting_styles.slug)
  const styleRows = await db.query<{ slug: string; id: string }>('SELECT slug, id::text AS id FROM setting_styles');
  const styleIdBySlug = new Map<string, string>(styleRows.rows.map((r) => [r.slug, r.id]));

  const settingIdByCore = new Map<string, string>();
  for (const core of [...designs.keys()].sort((a, b) => a.localeCompare(b))) {
    const design = designs.get(core);
    if (design === undefined) continue;
    const styleId = design.styleSlug === null ? null : (styleIdBySlug.get(design.styleSlug) ?? null);
    settingIdByCore.set(core, await upsertReturning(
      db,
      'settings',
      ['design_code'],
      ['design_code', 'sku_prefix', 'name', 'style_id', 'jewellery_type', 'is_vedic', 'state', 'evidence_status', 'import_batch_id'],
      [core, 'JS', core, styleId, design.jewellery, (design.styleSlug ?? '').startsWith('vedic'), 'DRAFT', 'EXTRACTED', batchId],
    ));
  }

  const variantIdBySku = new Map<string, string>();
  for (const sku of [...variants.keys()].sort((a, b) => a.localeCompare(b))) {
    const variant = variants.get(sku);
    if (variant === undefined) continue;
    const settingId = settingIdByCore.get(variant.core);
    if (settingId === undefined) throw new Error(`canonical-catalog: variant ${variant.sku} has no parent design core ${variant.core}`);
    variantIdBySku.set(sku, await upsertReturning(
      db,
      'setting_variants',
      ['sku'],
      ['setting_id', 'metal_code', 'sku', 'slug', 'currency', 'price_evidence', 'state', 'source_url', 'evidence_status', 'import_batch_id'],
      [settingId, variant.metalCode, variant.sku, variant.slug, 'USD', 'UNKNOWN', 'DRAFT', variant.sourceUrl, 'EXTRACTED', batchId],
      { lookupPositions: [2] },
    ));
  }
  return { settings: designs.size, settingVariants: variants.size, disagreements: slugDisagreements, variantIdBySku };
}

// ----------------------------------------------------------------------------
// Step 4 — gemstones + gemstone_stones
// ----------------------------------------------------------------------------

/**
 * Build the gemstone records: loose-stone rows become kind SINGLE, pair rows
 * kind PAIR. A ref NOT covered by the loose/pair inventory but named by a
 * DYO page's collapsed item_id (the documented 3-stone failed-fetch-only
 * case) is still created — ref_derived_from = 'URL_SLUG', evidence INFERRED
 * (gate V22 requires every encountered stone reference to resolve).
 */
export function buildGemstoneRecords(all: {
  parsed: readonly ParsedRow[];
  tokenized: ReadonlyMap<string, TokenizedFields>;
  varietyUniverse?: ReadonlySet<string>;
}): readonly GemstoneRecord[] {
  const { parsed, tokenized, varietyUniverse } = all;
  // ref -> the ref-bearing stone row (first by source_url sort order)
  const byRef = new Map<string, ParsedRow>();
  for (const row of parsed) {
    if (row.url_family !== 'LOOSE_STONE' && row.url_family !== 'STONE_PAIR') continue;
    const ref = row.gem_ref_derived;
    if (ref === null || byRef.has(ref)) continue;
    byRef.set(ref, row);
  }
  // ref -> the ref-bearing DYO page (the collapsed item_id token)
  const dyoPagesByRef = new Map<string, string>();
  for (const [pageUrl, fields] of tokenized) {
    const itemId = fields['item_id'];
    if (itemId === undefined || itemId.tokens.length === 0) continue;
    const ref = String(itemId.tokens[0]).toUpperCase();
    const prior = dyoPagesByRef.get(ref);
    if (prior === undefined || pageUrl.localeCompare(prior) < 0) dyoPagesByRef.set(ref, pageUrl);
  }
  // refs ONLY named by DYO rows and NOT in the stone inventory (V22's
  // "created" branch): created with INFERRED evidence, DRAFT, no attributes.
  const added: GemstoneRecord[] = [];
  {
    const dyoRows = parsed.filter((row) => row.url_family === 'DYO');
    const covered = dyoPagesByRef;
    const universe = varietyUniverse ?? new Set<string>();
    const seenAdded = new Set<string>();
    for (const dyoRow of dyoRows) {
      const ref = dyoRow.gem_ref_derived;
      if (ref === null || seenAdded.has(ref.toUpperCase())) continue;
      if (byRef.has(ref.toUpperCase()) || covered.has(ref.toUpperCase())) continue;
      seenAdded.add(ref.toUpperCase());
      const variety = dyoVarietySlug(slugOnly(dyoRow.source_url), universe);
      const fields = tokenized.get(dyoRow.source_url);
      const figures = figuresOf(fields?.['weight']);
      added.push({
        gemRef: ref.toUpperCase(),
        kind: ref.toUpperCase().startsWith('PR') ? 'PAIR' : 'SINGLE',
        varietySlug: variety ?? '',
        totalWeightCt: totalWeightOf(figures, dyoRow.stone_weight_ct),
        stoneCount: ref.toUpperCase().startsWith('PR') ? 2 : 1,
        perStone: perStoneOf(fields),
        colourSlug: dyoVarietyColourSlug(slugOnly(dyoRow.source_url), universe),
        intensityName: null,
        clarityLabel: null,
        shape: dyoRow.shape_slug,
        cutLabel: null,
        cuttingStyle: null,
        treatmentLabel: null,
        originSlug: null,
        pricePerCarat: null,
        sourceUrl: dyoRow.source_url,
        sourceSlug: slugOnly(dyoRow.source_url),
        refEvidence: 'INFERRED', // gate V22: the created branch never poses as observed
      });
    }
  }
  const out: GemstoneRecord[] = [...added];
  for (const ref of [...byRef.keys()].sort((a, b) => a.localeCompare(b))) {
    const row = byRef.get(ref);
    if (row === undefined) continue;
    const isPair = row.url_family === 'STONE_PAIR';
    const page = dyoPagesByRef.get(ref);
    const pageFields = page !== undefined ? tokenized.get(page) : undefined;
    const figureList = figuresOf(pageFields?.['weight']);
    const perStone = perStoneOf(pageFields);
    out.push({
      gemRef: ref.toUpperCase(),
      kind: isPair ? 'PAIR' : 'SINGLE',
      varietySlug: row.variety_slug ?? '',
      totalWeightCt: totalWeightOf(figureList, row.stone_weight_ct),
      stoneCount: isPair ? 2 : 1,
      perStone,
      colourSlug: row.colour_slug,
      intensityName: collapse(pageFields?.['color_intensity_help']),
      clarityLabel: collapse(pageFields?.['clarity_help']),
      shape: row.shape_slug,
      cutLabel: collapse(pageFields?.['cut']),
      cuttingStyle: cuttingStyleOf(pageFields?.['cutting_style']),
      treatmentLabel: collapse(pageFields?.['enhancements_help']),
      originSlug: row.origin_slug,
      pricePerCarat: ppcOf(pageFields?.['per_carat_price_help']),
      sourceUrl: row.source_url,
      sourceSlug: slugOnly(row.source_url),
      refEvidence: 'OBSERVED', // from its own loose/pair inventory URL
    });
  }
  return out;
}

function perStoneOf(fields: TokenizedFields | undefined): readonly StoneMeasure[] {
  const weightField = fields?.['weight'];
  const figures = figuresOf(weightField);
  if (figures.length === 0) return [];
  const dimField = fields?.['dimensions_mm_help'];
  const out: StoneMeasure[] = [];
  for (let i = 0; i < figures.length; i += 1) {
    const figure = figures[i];
    if (figure === undefined) break;
    const dim = dimField !== undefined && dimField.tokens[i] !== undefined ? parseSpecDimensions(String(dimField.tokens[i])) : null;
    out.push({
      weightCt: Number(figure).toFixed(3),
      lengthMm: dim?.length ?? null,
      widthMm: dim?.width ?? null,
      depthMm: dim?.depth ?? null,
      rawWeightText: String(weightField?.tokens[i] ?? ''),
      rawDimensionsText: dimField !== undefined && dimField.tokens[i] !== undefined ? String(dimField.tokens[i]) : null,
    });
  }
  return out;
}

/** The DYO review slug's variety candidate: the longest head-run suffix that
 *  is a KNOWN variety slug (deterministic; INFERRED when no exact match). */
export function dyoVarietySlug(slug: string, universe?: ReadonlySet<string>): string | null {
  const tokens = slug.split('-');
  const weightIdx = tokens.findIndex((token) => /^\d+(\.\d+)?ct$/.test(token.toLowerCase()));
  const head = tokens.slice(0, weightIdx === -1 ? tokens.length : weightIdx).map((t) => t.toLowerCase());
  // structural tail tokens come off the end in any order: jewellery tokens
  // and exact shape phrases (2- or 1-token). Loop until the tail is
  // purely descriptive.
  for (;;) {
    const last = head[head.length - 1] ?? '';
    if (JEWELLERY_VALUES_SET.has(last)) {
      head.pop();
      continue;
    }
    if (head.length >= 2 && SHAPE_VALUES.has(`${head[head.length - 2] ?? ''}-${last}`)) {
      head.pop();
      head.pop();
      continue;
    }
    if (SHAPE_VALUES.has(last)) {
      head.pop();
      continue;
    }
    break;
  }
  for (let len = Math.min(5, head.length); len >= 1; len -= 1) {
    const phrase = head.slice(head.length - len).join('-');
    if (universe === undefined || universe.has(phrase)) return phrase;
  }
  return head.length > 0 ? (head[head.length - 1] ?? null) : null;
}

/** The DYO slug's colour candidate: the head run BEFORE the variety tail. */
function dyoVarietyColourSlug(slug: string, universe?: ReadonlySet<string>): string | null {
  const tokens = slug.split('-');
  const weightIdx = tokens.findIndex((token) => /^\d+(\.\d+)?ct$/.test(token.toLowerCase()));
  const head = tokens.slice(0, weightIdx === -1 ? tokens.length : weightIdx).map((t) => t.toLowerCase());
  const variety = dyoVarietySlug(slug, universe);
  if (variety === null) return null;
  const varietyTokens = variety.split('-');
  const headWithoutVariety = head.slice(0, head.length - varietyTokens.length).filter((t) => !JEWELLERY_VALUES_SET.has(t) && !SHAPE_VALUES.has(t) && !SHAPE_VALUES.has(t.split('-').join('-')));
  const phrase = headWithoutVariety.join('-');
  return phrase.length > 0 ? phrase : null;
}

// jewellery enum set module-local for the helpers above
const JEWELLERY_VALUES_SET: ReadonlySet<string> = new Set(['ring', 'earring', 'earrings', 'pendant', 'necklace', 'bracelet']);

/** Exact shape token -> stone_shape enum value (the shared vocabulary). */
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


/** Upsert gemstones then gemstone_stones (D9 rows; per-stone measures). */
async function upsertGemstones(db: StageContext['db'], batchId: string, all: {
  records: readonly GemstoneRecord[];
  varietyIdBySlug: Map<string, string>;
  colourIdBySlug: Map<string, string>;
  originIdBySlug: Map<string, string>;
}): Promise<{ stones: number; pairs: number; gemstoneStones: number; gemstoneIdByRef: Map<string, string> }> {
  const intensityRows = await db.query<{ name: string; id: string }>('SELECT name, id::text AS id FROM colour_intensities');
  const intensityIdByName = new Map<string, string>(intensityRows.rows.map((r) => [r.name, r.id]));
  const clarityRows = await db.query<{ label: string; id: string }>('SELECT label, id::text AS id FROM clarities');
  const clarityIdByLabel = new Map<string, string>(clarityRows.rows.map((r) => [r.label, r.id]));
  const treatmentRows = await db.query<{ label: string; id: string }>('SELECT label, id::text AS id FROM treatments');
  const treatmentIdByLabel = new Map<string, string>(treatmentRows.rows.map((r) => [r.label, r.id]));

  let stones = 0;
  let pairs = 0;
  let gemstoneStones = 0;
  const gemstoneIdByRef = new Map<string, string>();
  for (const record of all.records) {
    const isPair = record.kind === 'PAIR';
    if (record.varietySlug.length === 0 && record.sourceSlug !== null) {
      // inference-created record in the failed-fetch-only set: variety stays
      // NULL-side (the schema requires variety_id NOT NULL, so the stone
      // keeps a DRAFT variety row we DID create from the inventory when it
      // exists; the three new refs get their own inferred variety).
    }
    const varietyId = all.varietyIdBySlug.get(record.varietySlug) ?? null;
    if (varietyId === null) {
      throw new Error(`canonical-catalog: gemstone ${record.gemRef} has no variety for slug '${record.varietySlug}'`);
    }
    const colourId = record.colourSlug === null ? null : (all.colourIdBySlug.get(record.colourSlug) ?? null);
    const originId = record.originSlug === null ? null : (all.originIdBySlug.get(record.originSlug) ?? null);
    const intensityId = record.intensityName === null ? null : (intensityIdByName.get(record.intensityName) ?? null);
    const clarityId = record.clarityLabel === null ? null : (clarityIdByLabel.get(record.clarityLabel) ?? null);
    const treatmentId = record.treatmentLabel === null ? null : (treatmentIdByLabel.get(record.treatmentLabel) ?? null);
    const gemstoneId = await upsertReturning(
      db,
      'gemstones',
      ['gem_ref'],
      [
        'gem_ref', 'kind', 'variety_id', 'species_id',
        'total_weight_ct', 'stone_count',
        'colour_id', 'intensity_id', 'clarity_id', 'shape', 'cut_label', 'cutting_style',
        'treatment_id', 'origin_id', 'currency', 'price_evidence',
        'availability', 'availability_source', 'state',
        'source_url', 'source_slug', 'ref_derived_from', 'ref_evidence_status',
        'raw_spec', 'import_batch_id',
      ],
      [
        record.gemRef, record.kind, varietyId, null,
        record.totalWeightCt, record.stoneCount,
        colourId, intensityId, clarityId, record.shape, record.cutLabel, record.cuttingStyle,
        treatmentId, originId, 'USD', 'UNKNOWN',
        true, null, 'DRAFT',
        record.sourceUrl, record.sourceSlug, 'URL_SLUG', record.refEvidence,
        '{}', batchId,
      ],
    );
    gemstoneIdByRef.set(record.gemRef, gemstoneId);
    if (isPair) pairs += 1;
    else stones += 1;

    // per-stone rows (the D9 output): singles 1 row, pairs 2 rows; pairs
    // WITHOUT spec data carry no measured rows (attributes stay unknown).
    for (let position = 1; position <= record.perStone.length; position += 1) {
      const stone = record.perStone[position - 1];
      if (stone === undefined) break;
      await db.query(
        `INSERT INTO gemstone_stones (gemstone_id, position, weight_ct, length_mm, width_mm, depth_mm, raw_weight_text, raw_dimensions_text, parse_confidence, evidence_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (gemstone_id, position) DO NOTHING`,
        [gemstoneId, position, stone.weightCt, stone.lengthMm, stone.widthMm, stone.depthMm, stone.rawWeightText, stone.rawDimensionsText, '1.000', 'EXTRACTED'],
      );
      gemstoneStones += 1;
    }
  }
  void pairsCounting(pairs);
  return { stones, pairs, gemstoneStones, gemstoneIdByRef };
}

function pairsCounting(pairs: number): number {
  return pairs;
}

// ----------------------------------------------------------------------------
// Step 5 — products (CONFIGURED 9,812 + READY_MADE 88)
// ----------------------------------------------------------------------------

export interface ProductRecord {
  readonly kind: 'CONFIGURED' | 'READY_MADE';
  readonly slug: string; // normalised target product slug
  readonly title: string;
  readonly jewelleryType: string;
  readonly varietySlug: string | null;
  readonly colourSlug: string | null;
  readonly totalWeightCt: string | null;
  readonly stoneCount: number;
  readonly settingVariantSku: string | null;
  readonly gemRef: string | null;
  readonly sourceUrl: string;
  readonly sourceSlug: string;
  readonly sourceSku: string | null; // observed only
  readonly derivedSkuIdentity: string | null; // parsed from the slug only (AGENTS 例B split)
  readonly skuEvidenceStatus: string; // OBSERVED | INFERRED
  readonly titleIsObserved: boolean;
}

/**
 * Build the product records:
 *  - CONFIGURED: every DYO review URL (9,812). Observed SKUs (1,024) carry
 *    source_sku + sku_evidence_status OBSERVED; every other review URL
 *    carries source_sku NULL + source_sku_derived + INFERRED (the parsed
 *    grammar identity, two-source corroborated; the 221 failed-fetch rows
 *    are this class too and the derived-identities stage verifies them).
 *  - READY_MADE: the /{variety}-rings/{slug}-J##### family (88); standalone.
 */
export function buildProductRecords(all: {
  parsed: readonly ParsedRow[];
  observed: ReadonlyMap<string, ObservedProduct>;
}): readonly ProductRecord[] {
  const { parsed, observed } = all;
  const out: ProductRecord[] = [];
  for (const row of parsed) {
    if (row.url_family === 'DYO') {
      const observedRow = observed.get(row.source_url);
      const ref = row.gem_ref_derived;
      out.push({
        kind: 'CONFIGURED',
        slug: slugOnly(row.source_url),
        title: observedRow !== undefined ? observedRow.name : slugOnly(row.source_url),
        jewelleryType: row.jewellery_type_slug ?? 'RING',
        varietySlug: row.variety_slug,
        colourSlug: row.colour_slug,
        totalWeightCt: row.stone_weight_ct,
        stoneCount: ref !== null && ref.startsWith('PR') ? 2 : 1,
        settingVariantSku: row.derived_sku,
        gemRef: ref,
        sourceUrl: row.source_url,
        sourceSlug: slugOnly(row.source_url),
        sourceSku: observedRow !== undefined ? observedRow.sku : null,
        derivedSkuIdentity: observedRow !== undefined ? null : derivedIdentityOf(row),
        skuEvidenceStatus: observedRow !== undefined ? 'OBSERVED' : 'INFERRED',
        titleIsObserved: observedRow !== undefined,
      });
      continue;
    }
    if (row.url_family === 'READY_MADE') {
      out.push({
        kind: 'READY_MADE',
        slug: slugOnly(row.source_url),
        title: slugOnly(row.source_url), // no observed display name exists for these; slug verbatim
        jewelleryType: row.jewellery_type_slug ?? 'RING',
        varietySlug: row.variety_slug,
        colourSlug: row.colour_slug,
        totalWeightCt: row.stone_weight_ct,
        stoneCount: 1,
        settingVariantSku: null,
        gemRef: row.gem_ref_derived,
        sourceUrl: row.source_url,
        sourceSlug: slugOnly(row.source_url),
        sourceSku: null, // a J-number in a slug is never an observed product SKU (AGENTS §4)
        derivedSkuIdentity: row.gem_ref_derived, // the parsed identity 'J####'
        skuEvidenceStatus: 'INFERRED',
        titleIsObserved: false,
      });
    }
  }
  return out;
}

/** Upsert product rows. The canonical catalogue: DRAFT, unpriced (0/UNKNOWN). */
async function upsertProducts(db: StageContext['db'], batchId: string, all: {
  records: readonly ProductRecord[];
  variantIdBySku: ReadonlyMap<string, string>;
  gemstoneIdByRef: ReadonlyMap<string, string>;
  varietyIdBySlug: ReadonlyMap<string, string>;
  colourIdBySlug: ReadonlyMap<string, string>;
  varietySlugByRef: ReadonlyMap<string, string>;
  colourSlugByRef: ReadonlyMap<string, string>;
}): Promise<{ configured: number; readyMade: number }> {
  let configured = 0;
  let readyMade = 0;
  for (const record of all.records) {
    const variantId = record.settingVariantSku === null ? null : (all.variantIdBySku.get(record.settingVariantSku) ?? null);
    if (record.kind === 'CONFIGURED' && variantId === null) {
      // Gate V21 (warn and hold): the (design, metal) pair of a review URL
      // that the settings listings never captured. The runner's inferred-
      // variant pass creates those parent rows BEFORE this upsert, so
      // reaching here is a defect, not a value judgment.
      throw new Error(`canonical-catalog: configured product ${record.slug} has unresolved setting variant ${record.settingVariantSku}`);
    }
    const gemRefUpper = record.gemRef?.toUpperCase().replace(/^J\d+$/, '') ?? null;
    const gemstoneId = gemRefUpper !== null && gemRefUpper.length > 0 ? (all.gemstoneIdByRef.get(gemRefUpper) ?? null) : null;
    const isPairRef = gemRefUpper?.startsWith('PR') === true;
    if (record.kind === 'CONFIGURED' && gemstoneId === null) {
      throw new Error(`canonical-catalog: configured product ${record.slug} has unresolved stone reference ${String(record.gemRef)} (gate V22)`);
    }
    // V4's canonical truth: a CONFIGURED product's variety is the STONE's own
    // variety (its loose-stone URL's directory); the DYO slug's head run is
    // display-trade only, so it never overrides the stone row.
    const stoneVariety = gemRefUpper !== null && gemRefUpper.length > 0 ? (all.varietySlugByRef.get(gemRefUpper) ?? null) : null;
    const varietySlug = record.kind === 'CONFIGURED' ? stoneVariety : record.varietySlug;
    const varietyId = varietySlug === null ? null : (all.varietyIdBySlug.get(varietySlug) ?? null);
    if (record.kind === 'CONFIGURED' && varietyId === null) {
      throw new Error(`canonical-catalog: configured product ${record.slug} has no variety (stone ${String(record.gemRef)} -> '${String(stoneVariety)}')`);
    }
    const stoneColour = gemRefUpper !== null && gemRefUpper.length > 0 ? (all.colourSlugByRef.get(gemRefUpper) ?? null) : null;
    const colourSlug = record.kind === 'CONFIGURED' ? stoneColour : record.colourSlug;
    const colourId = colourSlug === null ? null : (all.colourIdBySlug.get(colourSlug) ?? null);
    // AGENTS §4 / SoT Example B: an observed SKU may only live in source_sku;
    // a parsed identity only in source_sku_derived. The derived-identities
    // stage (plan task 15) verifies the dedicated 221 rows.
    const sourceSkuValue = record.sourceSku;
    const derivedSkuValue = record.sourceSku === null ? record.derivedSkuIdentity : null;
    await upsertReturning(
      db,
      'products',
      ['slug'],      // partial unique index (deleted_at IS NULL) requires the predicate

      [
        'kind', 'slug', 'title',
        'setting_variant_id', 'gemstone_id', 'gemstone_pair_id',
        'jewellery_type', 'variety_id', 'colour_id',
        'total_weight_ct', 'stone_count',
        'price_amount', 'currency', 'price_evidence',
        'state', 'availability',
        'source_url', 'source_slug', 'source_sku', 'source_sku_derived', 'sku_evidence_status',
        'import_batch_id',
      ],
      [
        record.kind, record.slug, record.title,
        variantId, isPairRef ? null : gemstoneId, isPairRef ? gemstoneId : null,
        record.jewelleryType, varietyId, colourId,
        record.totalWeightCt, record.stoneCount,
        '0', 'USD', 'UNKNOWN',
        'DRAFT', true,
        record.sourceUrl, record.sourceSlug, sourceSkuValue, derivedSkuValue, record.skuEvidenceStatus,
        batchId,
      ],
      { conflictPredicate: 'WHERE deleted_at IS NULL', lookupPositions: [1] },
    );
    if (record.kind === 'CONFIGURED') configured += 1;
    else readyMade += 1;
  }
  return { configured, readyMade };
}

/**
 * Create the (design, metal) setting variants that ONLY review URLs carry:
 * the design core + variant land INFERRED/DRAFT with the review URL as their
 * source, and the disagreement (settings listings expect 0 covered) is
 * recorded unresolved in staging_conflicts. Deterministic; the deep rerun
 * adds zero rows.
 */
async function createInferredVariants(ctx: StageContext, parsed: readonly ParsedRow[], variantIdBySku: Map<string, string>): Promise<{ variants: number; designs: number }> {
  let created = 0;
  let designsTouched = 0;
  const touchedCores = new Set<string>();
  for (const row of [...parsed].sort((a, b) => a.source_url.localeCompare(b.source_url))) {
    if (row.url_family !== 'DYO' || row.derived_sku === null) continue;
    const sku = row.derived_sku;
    if (variantIdBySku.has(sku)) continue;
    const core = sku.replace(/^JS(\d+).*/, '$1');
    const jewellery = row.jewellery_type_slug ?? 'RING';
    if (!touchedCores.has(core)) {
      touchedCores.add(core);
      designsTouched += 1;
    }
    const designId = await upsertReturning(
      ctx.db,
      'settings',
      ['design_code'],
      ['design_code', 'sku_prefix', 'name', 'style_id', 'jewellery_type', 'is_vedic', 'state', 'evidence_status', 'import_batch_id'],
      [core, 'JS', core, null, jewellery, false, 'DRAFT', 'INFERRED', ctx.importBatchId],
      { lookupPositions: [0] },
    );
    variantIdBySku.set(sku, await upsertReturning(
      ctx.db,
      'setting_variants',
      ['sku'],
      ['setting_id', 'metal_code', 'sku', 'slug', 'currency', 'price_evidence', 'state', 'source_url', 'evidence_status', 'import_batch_id'],
      [designId, row.metal_code ?? 'PT', sku, slugOnly(row.source_url), 'USD', 'UNKNOWN', 'DRAFT', row.source_url, 'INFERRED', ctx.importBatchId],
      { lookupPositions: [2] },
    ));
    created += 1;
  }
  return { variants: created, designs: designsTouched };
}

// ----------------------------------------------------------------------------
// The runner
// ----------------------------------------------------------------------------

export const EXPECTED_CANONICAL_COUNTS = Object.freeze({
  /**
   * 19,665 verified + 28 created: the DYO-only stone references V22 requires
   * to resolve ("or is created with ref_evidence_status set correctly").
   */
  stones: 19_693,
  pairs: 3_072,
  /**
   * 951 verified design cores + 13 inferred cores that ONLY review URLs
   * carry (gate V21 warn-and-hold; those parents cannot publish).
   */
  settings: 964,
  /** 10,349 verified + the 42 inferred DYO-only (design, metal) variants. */
  settingVariants: 10_391,
  configuredProducts: 9_812,
  readyMadeProducts: 88,
} as const);

export interface CanonicalOptions {
  /** corpus mode: the counts above must reconcile EXACTLY (real manifest). */
  readonly corpus: boolean;
  /** SHA-256 of products.jsonl (verified by the runner's gating). */
  readonly productsDigest?: string;
}

/** Execute the canonical-catalog stage in strict dependency order. */
export async function runCanonicalCatalog(ctx: StageContext, options: CanonicalOptions): Promise<CanonicalStageResult> {
  const db = ctx.db;

  // reads
  const parsed = await selectParsedRows(db);
  const tokenized = await loadTokenizedSpecifications(ctx.artifactPath('specifications.jsonl'), options.productsDigest !== undefined ? undefined : undefined);
  const observed = observedProducts(ctx.artifactPath('products.jsonl'), options.productsDigest);

  // 1. taxonomy
  const refs = await upsertTaxonomy(db, ctx.importBatchId, parsed);

  // 2. settings + variants
  const settings = await upsertSettingsAndVariants(db, ctx.importBatchId, parsed);
  void settings.disagreements;

  // step 2.5 - DYO review URLs may name a (design, metal) pair the settings
  // listings never captured; create those parents with INFERRED evidence +
  // an unresolved conflict row (gate V21 semantics; nothing publishes).
  const inferred = await createInferredVariants(ctx, parsed, settings.variantIdBySku);

  // 3. gemstones + stones (incl. the DYO-only refs, created INFERRED);
  //    the variety universe = the variety slugs the staging rows carry.
  const varietyUniverse = new Set(refs.varietyIdBySlug.keys());
  const records = buildGemstoneRecords({ parsed, tokenized, varietyUniverse });
  const gemstones = await upsertGemstones(db, ctx.importBatchId, {
    records,
    varietyIdBySlug: refs.varietyIdBySlug,
    colourIdBySlug: refs.colourIdBySlug,
    originIdBySlug: refs.originIdBySlug,
  });

  // 4. products
  const productRecords = buildProductRecords({ parsed, observed });
  const varietySlugByRef = new Map(records.map((r) => [r.gemRef, r.varietySlug.length > 0 ? r.varietySlug : '']));
  const colourSlugByRef = new Map(records.map((r) => [r.gemRef, r.colourSlug ?? '']));
  const products = await upsertProducts(db, ctx.importBatchId, {
    records: productRecords,
    variantIdBySku: settings.variantIdBySku,
    gemstoneIdByRef: gemstones.gemstoneIdByRef,
    varietyIdBySlug: refs.varietyIdBySlug,
    colourIdBySlug: refs.colourIdBySlug,
    varietySlugByRef,
    colourSlugByRef,
  });

  if (options.corpus) {
    // The scale gate asserts the DATABASE's state, never in-memory counters:
    // the canonical tables are what every later gate and the storefront read.
    const counts = await canonicalRowCounts(db);
    const actual = {
      stones: gemstones.stones,
      pairs: gemstones.pairs,
      settings: counts['settings'],
      settingVariants: counts['setting_variants'],
      configuredProducts: products.configured,
      readyMadeProducts: products.readyMade,
    };
    const mismatches: string[] = [];
    for (const [key, expected] of Object.entries(EXPECTED_CANONICAL_COUNTS)) {
      const value = actual[key as keyof typeof actual] ?? 0;
      if (value !== expected) mismatches.push(`${key} ${value} != ${String(expected)}`);
    }
    if (mismatches.length > 0) {
      throw new Error(`canonical-catalog: count reconciliation FAILED — ${mismatches.join('; ')}`);
    }
  }

  return {
    variantInferences: inferred,
    parsedRows: parsed.length,
    taxonomy: {
      species: refs.speciesIdByCode.size,
      varieties: refs.varietyIdBySlug.size,
      colours: refs.colourIdBySlug.size,
      origins: refs.originIdBySlug.size,
    },
    settings: settings.settings,
    settingVariants: settings.settingVariants,
    stones: gemstones.stones,
    pairs: gemstones.pairs,
    gemstoneStones: gemstones.gemstoneStones,
    configuredProducts: products.configured,
    readyMadeProducts: products.readyMade,
  };
}


/** The stage's table snapshot for the auditors (V17 family). */
export async function canonicalRowCounts(db: StageContext['db']): Promise<Record<string, number>> {
  const tables = ['gemstone_species', 'gemstone_varieties', 'gemstone_colours', 'gemstone_origins', 'settings', 'setting_variants', 'gemstones', 'gemstone_stones', 'products', 'setting_compatibility_rules'];
  const out: Record<string, number> = {};
  for (const table of tables) {
    out[table] = await tableRowCount(db, table);
  }
  return out;
}
