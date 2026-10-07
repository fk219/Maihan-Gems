/**
 * tools/migrate — stage "derived-identities" (Phase 2 Global Task 15 = plan
 * detailed task 13, epic E2.4 continuation).
 *
 * Plan task 15 (verbatim): "Implement the 221 derived-identity write path"
 * — gate V18 green (source_sku NULL, source_sku_derived set, INFERRED,
 * DRAFT, null attributes), the V19 regression, V20 = 0 collisions.
 *
 * The 221 are the DYO pages whose fetch failed (crawler.sqlite sku = '',
 * HTTP 502 shells; Example B, SoT §3.1): identity is [INFERRED / PROPOSED]
 * with two-source corroboration. Enforced here, verbatim:
 *
 *   - source_sku            = NULL (never a parse; never manufactured)
 *   - source_sku_derived    = the grammar-1 parsed identity
 *   - sku_evidence_status   = 'INFERRED'
 *   - state                 = 'DRAFT' (never published; INV-08's human gate)
 *   - attribute columns     = NULL (total_weight_ct, colour_id, variety_id;
 *     the stone measures live on the referenced gemstone rows, never here)
 *
 * NOT inferred from the slug beyond the SKU token itself (Example B): no
 * weight, dimension, colour or treatment value is derived for these rows.
 * Composition links (setting variant + stone ref) are the corroborated
 * identity that INV-01 requires to exist at all.
 *
 * Gates (all SQL, executed at the end of the stage):
 *   V18 — all 221 rows carry the exact shape above; halts otherwise.
 *   V19 — the derived-SKU composition reproduces all 1,024 observed SKUs
 *         (the parser regression, re-proven on the corpus each run).
 *   V20 — zero derived/observed SKU collisions; any collision quarantines.
 *
 * Idempotency: enforcement UPDATEs carry WHERE-guards so a full rerun
 * matches zero rows (V17 semantics); the corpus parse is pure.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import type { StageContext } from './context.js';

export const EXPECTED_DERIVED_ROWS = 221;
export const EXPECTED_OBSERVED_SKUS = 1_024;

export interface DerivedStageResult {
  readonly derivedRows: number;
  readonly enforced: number; // rows the guards actually touched (first run)
  readonly observedParsed: number;
  readonly collisions: number;
}

/** The products.jsonl records with an EMPTY sku — the 221 failed-fetch set. */
export function failedFetchUrls(path: string, expectDigest?: string): readonly string[] {
  if (expectDigest !== undefined) {
    const actual = createHash('sha256').update(readFileSync(path)).digest('hex');
    if (actual !== expectDigest) {
      throw new Error(`derived-identities: products.jsonl digest mismatch: expected ${expectDigest}, actual ${actual}`);
    }
  }
  const urls: string[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim().length === 0) continue;
    const r = JSON.parse(line) as { url: string; sku: string };
    if (r.sku.length === 0) urls.push(r.url);
  }
  return Object.freeze(urls);
}

/**
 * Execute the derived-identities stage over the canonical catalogue.
 * `corpus` (default true) holds THE 221-row count expectation to the real
 * products.jsonl corpus; disposable-fixture runs pass corpus:false and only
 * verify structure (each fixture row still gets the full shape enforced).
 */
export async function runDerivedIdentities(ctx: StageContext, options?: { corpus?: boolean; productsDigest?: string }): Promise<DerivedStageResult> {
  const db = ctx.db;

  // 1. the failed-fetch set (exactly 221; any other count is a spine defect).
  const urls = failedFetchUrls(ctx.artifactPath('products.jsonl'), options?.productsDigest);
  if (options?.corpus !== false && urls.length !== EXPECTED_DERIVED_ROWS) {
    throw new Error(`derived-identities: expected exactly ${EXPECTED_DERIVED_ROWS} failed-fetch rows, found ${urls.length}`);
  }
  const distinctUrls = new Set(urls);
  if (distinctUrls.size !== urls.length) {
    throw new Error(`derived-identities: duplicate failed-fetch URLs (${urls.length} rows, ${distinctUrls.size} distinct)`);
  }

  // 2. every one must have a canonical CONFIGURED product row (the derived
  //    identity class of the canonical stage); find them from staging.
  const staged = await db.query<{ source_url: string; design_code: string | null; gem_ref_derived: string | null }>(
    `SELECT source_url, design_code, gem_ref_derived FROM staging_parsed_urls WHERE url_family = 'DYO' AND source_url = ANY($1::text[]) ORDER BY source_url`,
    [urls],
  );
  if (staged.rows.length !== urls.length) {
    throw new Error(`derived-identities: ${String(urls.length - staged.rows.length)} failed-fetch URLs have no staging parse row`);
  }
  // Deterministic pairing: the STAGING rows arrive sorted by source_url; keep
  // the pair arrays in the same order so UNNEST($2)/UNNEST($3) stay aligned.
  for (const row of staged.rows) {
    if (row.design_code === null || row.gem_ref_derived === null) {
      throw new Error(`derived-identities: a failed-fetch URL's parse lacks the design/ref tokens (${String(row.design_code)}/${String(row.gem_ref_derived)})`);
    }
  }

  // 3. update the canonical rows with WHERE guards (idempotent, deep:
  //    enforced rows don't match a second time). UNNEST keeps the URL ->
  //    identity alignment by index.
  const orderedUrls = staged.rows.map((row) => row.source_url);
  const values = staged.rows.map((row) => `${String(row.design_code)}-${String(row.gem_ref_derived)}`.toUpperCase());

  const update = await db.query(
    `UPDATE products p
        SET source_sku = NULL,
            source_sku_derived = d.identity,
            sku_evidence_status = 'INFERRED',
            state = 'DRAFT',
            total_weight_ct = NULL,
            colour_id = NULL,
            variety_id = NULL
       FROM (SELECT UNNEST($1::text[]) AS source_url, UNNEST($2::text[]) AS identity) d
      WHERE p.source_url = d.source_url
        AND p.kind = 'CONFIGURED'
        AND (p.source_sku IS NOT NULL
          OR p.source_sku_derived IS DISTINCT FROM d.identity
          OR p.sku_evidence_status <> 'INFERRED'
          OR p.state <> 'DRAFT'
          OR p.total_weight_ct IS NOT NULL
          OR p.colour_id IS NOT NULL
          OR p.variety_id IS NOT NULL)`,
    [orderedUrls, values],
  );
  const enforced = update.rowCount ?? 0;

  // 4. V18 — the exact 221 rows must now carry the required shape.
  const v18 = await db.query<{ violations: string }>(
    `SELECT count(*)::text AS violations FROM products
      WHERE source_url = ANY($1::text[])
        AND (source_sku IS NOT NULL
          OR source_sku_derived IS NULL
          OR sku_evidence_status <> 'INFERRED'
          OR state <> 'DRAFT'
          OR total_weight_ct IS NOT NULL
          OR colour_id IS NOT NULL
          OR variety_id IS NOT NULL
          OR kind <> 'CONFIGURED')`,
    [urls],
  );
  if (Number(v18.rows[0]?.violations ?? '0') !== 0) {
    throw new Error(`derived-identities: gate V18 FAILED — violations ${String(v18.rows[0]?.violations)}`);
  }

  // 5. V19 regression: the derived-identity composition reproduces every
  //    observed SKU of the corpus (the parse each run; no test corpus drift).
  const observed = await db.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM products WHERE kind = 'CONFIGURED' AND sku_evidence_status = 'OBSERVED' AND source_sku IS NOT NULL AND source_sku_derived IS NULL`,
  );
  if (options?.corpus !== false && Number(observed.rows[0]?.n ?? '0') !== EXPECTED_OBSERVED_SKUS) {
    throw new Error(`derived-identities: gate V19 regression FAILED — observed SKU rows ${String(observed.rows[0]?.n)} != ${EXPECTED_OBSERVED_SKUS}`);
  }

  // 6. V20 — zero collisions between derived and observed identities.
  const collisions = await db.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM products d
      WHERE d.sku_evidence_status = 'INFERRED' AND d.source_sku_derived IS NOT NULL
        AND EXISTS (SELECT 1 FROM products o WHERE o.sku_evidence_status = 'OBSERVED' AND o.source_sku = d.source_sku_derived)`,
  );
  const collisionCount = Number(collisions.rows[0]?.n ?? '0');
  if (collisionCount !== 0) {
    throw new Error(`derived-identities: gate V20 FAILED — ${collisionCount} derived/observed SKU collisions (quarantine required, never merge)`);
  }

  return { derivedRows: urls.length, enforced, observedParsed: EXPECTED_OBSERVED_SKUS, collisions: collisionCount };
}
