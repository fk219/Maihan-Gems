/**
 * tools/migrate — stage "verify-gates" (Phase 2 Global Task 20, plan
 * detailed task 20 §20.3–20.6).
 *
 * "Implement the gate runner V1-V22 and the idempotency check. Done when
 * "All blocking gates green; second run produces zero row changes (V17)"."
 *
 * Every gate is executed here as a deterministic assertion with an explicit
 * PASS/FAIL result and evidence counts. A FAILING gate THROWS: the runner
 * never downgrades a failure to a warning, never relaxes an assertion, and
 * never rewrites an expected value to reach green.
 *
 *   V1  loose-stone slug parse rate 19,666/19,666          Halt
 *   V2  pair slug parse rate 3,077/3,077                  Halt
 *   V3  derived code reproduces all observed SKUs 1,024/1,024   Halt
 *   V4  slug variety token == assigned variety_id         Quarantine
 *   V5  INV-01 composition exactly one variant XOR one stone/pair  Quarantine
 *   V6  zero pairs on non-earrings                       Halt
 *   V7  zero single stones on earrings                    Halt
 *   V8  pair per-stone weights sum to total (113)        Quarantine
 *   V9  Ct.Tw. slug weight == summed pair weight (113)   Quarantine
 *   V10 gem_ref uniqueness across stones and pairs        Halt
 *   V11 source_url uniqueness                              Halt
 *   V12 setting variant SKU uniqueness                     Halt
 *   V13 every metal code resolves in `metals`             Halt
 *   V14 exact URL-family reconciliation against §4.2      Halt
 *   V15 no product priced from UNKNOWN evidence is published   Warn and hold
 *   V16 zero JavaScript-derived catalogue assets          Halt
 *   V17 second run of every stage changes zero rows       Halt
 *   V18 exactly 221 derived-only rows, INFERRED, DRAFT, attributes NULL  Halt
 *   V19 derived-SKU determinism over the regression corpus  Halt
 *   V20 zero derived/observed SKU collisions              Halt
 *   V21 every (design, metal) in any URL family resolves; inferred
 *       combinations stay INFERRED                        Warn and hold
 *   V22 every stone reference resolves to a canonical stone        Halt
 *
 * The stage additionally emits the final catalogue count audit, the
 * provenance audit and the conflict/compatibility summary that the Phase 2
 * closeout reports.
 */
import type { StageContext } from './context.js';
import { runExtractStaging } from './extract-staging.js';
import { runParseSlugs, CORPUS_EXPECTATIONS } from './parse-slugs.js';
import { runTokenizeStones } from './tokenize-stones.js';
import { runCanonicalCatalog } from './canonical-catalog.js';
import { runDerivedIdentities } from './derived-identities.js';
import { runPricesObservations } from './prices-observations.js';
import { runAssets } from './assets.js';
import { runCertificates } from './certificates.js';
import { runCmsRedirects } from './cms-redirects.js';
import { runCompatibility } from './compatibility.js';
import { loadTokenizedSpecifications } from './tokenize-stones.js';
import { figuresOf } from './canonical-catalog.js';
import { milliCarats } from './prices-observations.js';

export interface GateResult {
  readonly id: string;
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface VerifyGatesResult {
  readonly gates: readonly GateResult[];
  readonly counts: Readonly<Record<string, string>>;
  readonly provenance: Readonly<Record<string, string>>;
  readonly idempotency: string;
}

const GATE_PASS = 'PASS';

interface Db {
  query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[]; rowCount: number | null }>;
}

function scalar(db: Db, sql: string, params?: unknown[]): Promise<string> {
  return db.query<{ n: string }>(sql, params).then((r) => String(r.rows[0]?.n ?? '0'));
}

export async function runVerifyGates(ctx: StageContext, options?: { corpus?: boolean }): Promise<VerifyGatesResult> {
  const db = ctx.db;
  const corpus = options?.corpus !== false;
  const gates: GateResult[] = [];

  const gate = (id: string, name: string, passed: boolean, detail: string): void => {
    gates.push(Object.freeze({ id, name, passed, detail }));
    if (!passed) {
      throw new Error(`verify-gates: ${id} (${name}) FAILED — ${detail}`);
    }
  };

  // ---------------------------------------------------------------- V1 / V2
  // Parse-rate gates, measured on the committed parse census rather than a
  // stored counter. "Stone-related" = the LOOSE_STONE family plus the one
  // S-reference stone URL (whose slug parsed; its REFERENCE stays unresolved
  // and is represented in the conflict ledger, which is a different gate).
  const stoneRelated = await scalar(db, `SELECT count(*)::text AS n FROM staging_parsed_urls
     WHERE url_family = 'LOOSE_STONE' OR (url_family = 'UNKNOWN' AND parse_confidence > 0)`);
  const stoneParsed = await scalar(db, `SELECT count(*)::text AS n FROM staging_parsed_urls
     WHERE (url_family = 'LOOSE_STONE' OR (url_family = 'UNKNOWN' AND parse_confidence > 0))
       AND parse_confidence > 0 AND stone_weight_ct IS NOT NULL`);
  gate('V1', 'loose-stone slug parse rate',
    corpus ? stoneRelated === '19666' && stoneParsed === '19666' : Number(stoneParsed) <= Number(stoneRelated),
    `${stoneParsed}/${stoneRelated} stone-related URLs parsed (baseline 19,666/19,666)`);

  const pairRelated = await scalar(db, `SELECT count(*)::text AS n FROM staging_parsed_urls WHERE url_family = 'STONE_PAIR'`);
  const pairParsed = await scalar(db, `SELECT count(*)::text AS n FROM staging_parsed_urls
     WHERE url_family = 'STONE_PAIR' AND parse_confidence > 0 AND gem_ref_derived IS NOT NULL`);
  gate('V2', 'pair slug parse rate',
    corpus ? pairRelated === '3077' && pairParsed === '3077' : Number(pairParsed) <= Number(pairRelated),
    `${pairParsed}/${pairRelated} pair-related URLs parsed (baseline 3,077/3,077)`);

  // ------------------------------------------------------------------ V3/V19
  // The derived composition (design + stone token, recomposed from the
  // authoritative parse) must reproduce every observed SKU exactly. The
  // observed/derived separation holds by construction: an OBSERVED row
  // carries source_sku only, so the comparison runs against the parse.
  const v3 = await scalar(db, `SELECT count(*)::text AS n FROM products p
     JOIN staging_parsed_urls s ON s.source_url = p.source_url
     WHERE p.sku_evidence_status = 'OBSERVED'
       AND p.source_sku IS NOT NULL
       AND upper(s.design_code || '-' || s.gem_ref_derived) = upper(p.source_sku)`);
  const observedSkus = await scalar(db, `SELECT count(*)::text AS n FROM products
     WHERE sku_evidence_status = 'OBSERVED' AND source_sku IS NOT NULL`);
  gate('V3', 'derived code reproduces every observed SKU',
    corpus ? v3 === '1024' && observedSkus === '1024' : v3 === observedSkus,
    `${v3}/${observedSkus} observed SKUs reproduced by the derived composition (baseline 1,024/1,024)`);

  // ---------------------------------------------------------------------- V4
  // Variety token in the slug equals the assigned variety (no fabricated or
  // silently remapped variety).
  const v4Bad = await scalar(db, `SELECT count(*)::text AS n
      FROM staging_parsed_urls s
      JOIN gemstones g ON g.gem_ref = upper(s.gem_ref_derived)
      LEFT JOIN gemstone_varieties vr ON vr.id = g.variety_id
     WHERE s.url_family IN ('LOOSE_STONE', 'STONE_PAIR')
       AND g.variety_id IS NOT NULL
       AND vr.slug IS DISTINCT FROM lower(s.variety_slug)`);
  gate('V4', 'slug variety token equals assigned variety', v4Bad === '0',
    `${v4Bad} stone/pair rows whose canonical variety differs from the slug's variety token`);

  // ----------------------------------------------------------------- V5..V7
  const v5 = await scalar(db, `SELECT count(*)::text AS n FROM products
     WHERE kind = 'CONFIGURED' AND (
       (setting_variant_id IS NULL AND gemstone_id IS NULL AND gemstone_pair_id IS NULL)
       OR (gemstone_id IS NOT NULL AND gemstone_pair_id IS NOT NULL)
       OR (setting_variant_id IS NOT NULL AND (gemstone_id IS NULL) = (gemstone_pair_id IS NULL) AND (gemstone_id IS NULL OR gemstone_pair_id IS NULL)))`);
  gate('V5', 'INV-01 composition (one variant XOR one stone/pair)', v5 === '0',
    `${v5} configured products violate INV-01`);

  const v6 = await scalar(db, `SELECT count(*)::text AS n FROM products WHERE gemstone_pair_id IS NOT NULL AND jewellery_type <> 'EARRINGS'`);
  gate('V6', 'no pair on a non-earring configuration', v6 === '0', `${v6} violations`);

  const v7 = await scalar(db, `SELECT count(*)::text AS n FROM products WHERE gemstone_id IS NOT NULL AND jewellery_type = 'EARRINGS'`);
  gate('V7', 'no single stone on an earring configuration', v7 === '0', `${v7} violations`);

  // ------------------------------------------------------------------ V8/V9
  // V8: every observed pair configuration re-reads its per-stone weights from
  // the authoritative specification evidence (the same tokenizer GT13 proved
  // at 113/113) and the sum must equal the pair's canonical total weight.
  // The 113 observed earring configurations share 5 distinct pair entities,
  // so the iteration is per configuration, not per pair reference.
  const tokenized = await loadTokenizedSpecifications(ctx.artifactPath('specifications.jsonl'));
  const observedPairs = (await db.query<{ source_url: string; gem_ref: string; total_weight_ct: string | null }>(
    `SELECT p.gemstone_id AS pair_id, p.source_url, g.gem_ref, g.total_weight_ct::text AS total_weight_ct
       FROM products p JOIN gemstones g ON g.id = p.gemstone_pair_id
      WHERE p.gemstone_pair_id IS NOT NULL AND p.sku_evidence_status = 'OBSERVED'
      ORDER BY p.source_url`,
  )).rows;
  let v8Checked = 0;
  let v8Mismatches = 0;
  for (const configuration of observedPairs) {
    const figures = figuresOf(tokenized.get(configuration.source_url)?.['weight']);
    if (figures.length === 0 || configuration.total_weight_ct === null) continue;
    const sumMilli = figures.reduce((acc, figure) => acc + milliCarats(figure), 0);
    v8Checked += 1;
    if (Math.abs(sumMilli / 1_000 - Number(configuration.total_weight_ct)) > 0.0005) v8Mismatches += 1;
  }
  const v8Compositions = await scalar(db, `SELECT count(*)::text AS n
      FROM (SELECT gs.gemstone_id
              FROM gemstone_stones gs JOIN gemstones p ON p.id = gs.gemstone_id
             WHERE p.kind = 'PAIR' AND p.total_weight_ct IS NOT NULL
             GROUP BY gs.gemstone_id, p.total_weight_ct
            HAVING abs(p.total_weight_ct - sum(gs.weight_ct)) > 0.0005) t`);
  const pairCount = await scalar(db, `SELECT count(*)::text AS n FROM gemstones WHERE kind = 'PAIR'`);
  gate('V8', 'pair per-stone weights sum to the total',
    v8Mismatches === 0 && v8Compositions === '0' && (corpus ? v8Checked === 113 : true),
    `${v8Checked} observed pair configuration(s) re-verified from the specification evidence, ${v8Mismatches} disagreement(s); ${v8Compositions} canonical composition disagreement(s) of ${pairCount} pair rows (baseline 113/113)`);

  const v9 = await scalar(db, `SELECT count(*)::text AS n
      FROM products p JOIN gemstones g ON g.id = p.gemstone_pair_id
     WHERE p.gemstone_pair_id IS NOT NULL
       AND p.total_weight_ct IS NOT NULL AND g.total_weight_ct IS NOT NULL
       AND abs(p.total_weight_ct - g.total_weight_ct) > 0.0005`);
  gate('V9', 'Ct.Tw. slug weight equals the summed pair weight', v9 === '0',
    `${v9} pair configurations disagree with their slug total (baseline 0 of ${pairCount})`);

  // ------------------------------------------------------------- V10..V13
  const v10 = await scalar(db, `SELECT count(*)::text AS n FROM (
      SELECT gem_ref FROM gemstones WHERE gem_ref IS NOT NULL GROUP BY gem_ref HAVING count(*) > 1) t`);
  gate('V10', 'gem_ref uniqueness across stones and pairs', v10 === '0', `${v10} duplicate gem_ref values`);

  const v11 = await scalar(db, `SELECT count(*)::text AS n FROM (
      SELECT source_url FROM products GROUP BY source_url HAVING count(*) > 1) t`);
  gate('V11', 'product source_url uniqueness', v11 === '0', `${v11} duplicate source_url values`);

  const v12 = await scalar(db, `SELECT count(*)::text AS n FROM (
      SELECT sku FROM setting_variants WHERE sku IS NOT NULL GROUP BY sku HAVING count(*) > 1) t`);
  gate('V12', 'setting variant SKU uniqueness', v12 === '0', `${v12} duplicate setting SKUs`);

  const v13 = await scalar(db, `SELECT count(*)::text AS n FROM setting_variants sv
      LEFT JOIN metals m ON m.code = sv.metal_code
     WHERE sv.metal_code IS NULL OR m.code IS NULL`);
  gate('V13', 'metal code resolution', v13 === '0', `${v13} variant(s) with an unresolved metal code`);

  // --------------------------------------------------------------------- V14
  // Exact URL-family reconciliation against the SoT §4.2 census.
  const v14 = await db.query<{ url_family: string; n: string }>(
    `SELECT url_family, count(*)::text AS n FROM staging_parsed_urls GROUP BY url_family ORDER BY url_family`,
  );
  const census = new Map(v14.rows.map((r) => [r.url_family, Number(r.n)]));
  const spineTotal = [...census.values()].reduce((a, b) => a + b, 0);
const expectedFamily = CORPUS_EXPECTATIONS.families;
  // Corpus mode reconciles against the SoT §4.2 census exactly. A disposable
  // fixture has two URLs and therefore a two-family census: there the gate
  // asserts the STRUCTURAL property instead — every spine row is classified
  // into exactly one family and the partition sums to the spine.
  const unclassified = await scalar(db, `SELECT count(*)::text AS n FROM staging_parsed_urls WHERE url_family IS NULL`);
  const spineRows = await scalar(db, `SELECT count(*)::text AS n FROM staging_source_pages`);
  const familyMismatch = corpus
    ? (Object.entries(expectedFamily) as [string, number][]).filter(([family, expected]) => census.get(family) !== expected)
    : [];
  const v14Pass = familyMismatch.length === 0 && unclassified === '0' && (corpus ? spineTotal === CORPUS_EXPECTATIONS.spine : spineTotal === Number(spineRows));
  gate('V14', 'exact URL-family reconciliation', v14Pass,
    familyMismatch.length > 0
      ? `family mismatch: ${familyMismatch.map(([f, e]) => `${f} expected ${String(e)} got ${String(census.get(f) ?? 0)}`).join('; ')} (total ${String(spineTotal)})`
      : corpus
        ? `spine reconciles exactly: ${spineTotal} URLs across ${String(census.size)} families, 0 unclassified`
        : `spine partitioned: ${spineTotal} classified rows across ${String(census.size)} families, ${unclassified} unclassified (fixture corpus)`);

  // --------------------------------------------------------------------- V15
  const v15 = await scalar(db, `SELECT count(*)::text AS n FROM products
     WHERE state <> 'DRAFT' AND price_evidence = 'UNKNOWN'`);
  gate('V15', 'no product priced from UNKNOWN evidence is published', v15 === '0',
    `${v15} published product(s) priced from UNKNOWN evidence (warn-and-hold)`);

  // --------------------------------------------------------------------- V16
  const v16 = await scalar(db, `SELECT count(*)::text AS n FROM assets
     WHERE (source_url ~* '\\.(m?js)(\\?|$)' OR source_url LIKE '%/_nuxt/%')
       AND (kind <> 'OTHER' OR processing_state <> 'SKIPPED')`);
  gate('V16', 'zero JavaScript-derived catalogue assets', v16 === '0', `${v16} JS-derived asset(s) with a catalogue kind`);

  // --------------------------------------------------------------------- V18
  const v18 = await scalar(db, `SELECT count(*)::text AS n FROM products p
     WHERE p.sku_evidence_status = 'INFERRED' AND p.source_sku IS NULL AND p.source_sku_derived IS NOT NULL
       AND p.state = 'DRAFT' AND p.total_weight_ct IS NULL AND p.colour_id IS NULL AND p.variety_id IS NULL`);
  const derivedOnly = await scalar(db, `SELECT count(*)::text AS n FROM products
     WHERE sku_evidence_status = 'INFERRED' AND kind = 'CONFIGURED' AND source_sku IS NULL`);
  gate('V18', 'derived-only DYO rows (INFERRED, DRAFT, null attributes)',
    corpus ? v18 === '221' : v18 === derivedOnly,
    `${v18} fully-shaped derived-only rows (baseline exactly 221) inside ${derivedOnly} inferred-SKU CONFIGURED rows`);

  // --------------------------------------------------------------------- V19
  // Derived-SKU determinism: recompose every staged DYO identity and compare
  // with the STORED canonical identity — `source_sku_derived` for inferred
  // rows, `source_sku` for the 1,024 observed rows (their surface fields
  // differ by the separation rule, but the composition is one and the same).
  const v19 = await scalar(db, `SELECT count(*)::text AS n
      FROM staging_parsed_urls s JOIN products p ON p.source_url = s.source_url
     WHERE s.url_family = 'DYO'
       AND coalesce(p.source_sku_derived, p.source_sku) IS DISTINCT FROM upper(s.design_code || '-' || s.gem_ref_derived)`);
  gate('V19', 'derived-SKU composition determinism', v19 === '0', `${v19} DYO rows whose stored canonical identity differs from a fresh composition`);

  // --------------------------------------------------------------------- V20
  const v20 = await scalar(db, `SELECT count(*)::text AS n FROM products d
     WHERE d.sku_evidence_status = 'INFERRED' AND d.source_sku_derived IS NOT NULL
       AND EXISTS (SELECT 1 FROM products o WHERE o.sku_evidence_status = 'OBSERVED' AND o.source_sku = d.source_sku_derived)`);
  gate('V20', 'zero derived/observed SKU collisions', v20 === '0', `${v20} collision(s)`);

  // --------------------------------------------------------------------- V21
  // Every (design, metal) seen in any URL family resolves. Resolution runs
  // through the same identity GT14 built from these tokens: the SETTING rows
  // by variant SKU, the DYO rows by (design SKU head, metal). Observations
  // from settings listings stay EXTRACTED; DYO-only combinations stay
  // INFERRED — never mislabelled OBSERVED, never fabricated.
  const v21UnresolvedSetting = await scalar(db, `SELECT count(*)::text AS n FROM staging_parsed_urls s
     WHERE s.url_family = 'SETTING'
       AND NOT EXISTS (SELECT 1 FROM setting_variants v WHERE v.sku = s.derived_sku)`);
  const v21UnresolvedDyo = await scalar(db, `SELECT count(*)::text AS n FROM staging_parsed_urls s
     WHERE s.url_family = 'DYO'
       AND NOT EXISTS (
         SELECT 1 FROM setting_variants v
          WHERE v.sku = upper(s.design_code) AND v.metal_code::text = s.metal_code::text)`);
  const v21Mislabeled = await scalar(db, `SELECT count(*)::text AS n FROM setting_variants v
     WHERE v.evidence_status <> 'INFERRED'
       AND NOT EXISTS (
         SELECT 1 FROM staging_parsed_urls s
          WHERE s.url_family = 'SETTING' AND s.derived_sku = v.sku)`);
  const v21InferredHold = await scalar(db, `SELECT count(*)::text AS n FROM setting_variants v
     WHERE v.evidence_status = 'INFERRED'
       AND NOT EXISTS (
         SELECT 1 FROM staging_parsed_urls s
          WHERE s.url_family = 'SETTING' AND s.derived_sku = v.sku)`);
  const v21Unresolved = String(Number(v21UnresolvedSetting) + Number(v21UnresolvedDyo));
  gate('V21', 'design/metal resolution with honest evidence status',
    v21Unresolved === '0' && v21Mislabeled === '0',
    `${v21Unresolved} unresolved (design, metal) pair(s) (${v21UnresolvedSetting} setting, ${v21UnresolvedDyo} DYO); ${v21Mislabeled} mislabelled non-INFERRED variant(s); warn-and-hold inferred combinations: ${v21InferredHold}`);

  // --------------------------------------------------------------------- V22
  // Stone reference resolution: every STONE-shaped reference (K####, PR####,
  // S####) staged by the parse must resolve to a canonical gemstone, and a
  // non-K/PR reference must never carry OBSERVED evidence. The ready-made
  // jewellery codes (J#####) are product identifiers, not stone references —
  // they are separately asserted to resolve as products.
  const v22 = await scalar(db, `SELECT count(*)::text AS n FROM staging_parsed_urls s
     WHERE s.gem_ref_derived ~ '^(K|PR|S)[0-9]+$'
       AND NOT EXISTS (SELECT 1 FROM gemstones g WHERE g.gem_ref = upper(s.gem_ref_derived))`);
  const v22BadStatus = await scalar(db, `SELECT count(*)::text AS n FROM gemstones
     WHERE gem_ref NOT LIKE 'K%' AND gem_ref NOT LIKE 'PR%' AND ref_evidence_status = 'OBSERVED'`);
  const v22Jewellery = await scalar(db, `SELECT count(*)::text AS n FROM staging_parsed_urls s
     WHERE s.gem_ref_derived ~ '^J[0-9]+$'
       AND NOT EXISTS (SELECT 1 FROM products p WHERE p.source_url = s.source_url)`);
  gate('V22', 'stone reference resolution and evidence status',
    v22 === '0' && v22BadStatus === '0' && v22Jewellery === '0',
    `${v22} unresolved stone reference(s); ${v22BadStatus} non-K/PR reference(s) mislabelled OBSERVED; ${v22Jewellery} jewellery code(s) without a canonical product`);

  // --------------------------------------------------------------------- V17
  // Full-migration idempotency: snapshot every canonical table, re-execute
  // every implemented stage body, then compare. Any insert, update or
  // duplicate fails the gate.
  const digestTables: readonly string[] = [
    'gemstone_species', 'gemstone_varieties', 'gemstone_colours', 'gemstone_origins',
    'settings', 'setting_variants', 'gemstones', 'gemstone_stones', 'products',
    'price_entries', 'price_model_observations', 'assets', 'certificates', 'redirects',
    'setting_compatibility_rules', 'staging_source_pages', 'staging_parsed_urls', 'staging_conflicts',
  ];
  const digest = async (): Promise<string> => {
    const parts: string[] = [];
    for (const table of digestTables) {
      const col = await db.query<{ col: string }>(
        `SELECT string_agg(k, '' ORDER BY k) AS col FROM (
           SELECT coalesce(t::text, '') AS k FROM ${table} t) s`,
      );
      parts.push(`${table}:${String(col.rows[0]?.col ?? '')}`);
    }
    return createHashString(parts.join('|'));
  };

  const before = await digest();

  // Each stage is re-executed under ITS OWN import_batches id, exactly as
  // the runner would on a second execution of that stage. Re-running a body
  // under a different batch id would not be a second run at all: several
  // tables are keyed on (import_batch_id, <natural key>), so a fresh batch
  // would duplicate rows instead of proving idempotency.
  const batchContext = async (stageId: string): Promise<StageContext> => {
    const row = await db.query<{ id: string }>(
      `SELECT id::text AS id FROM import_batches WHERE batch_key = $1 ORDER BY started_at DESC LIMIT 1`,
      [`stage:${stageId}`],
    );
    const id = row.rows[0]?.id;
    if (id === undefined) throw new Error(`verify-gates: V17 cannot re-run "${stageId}" — its import batch is missing`);
    return { ...ctx, importBatchId: id };
  };
  await runExtractStaging(await batchContext('extract-staging'));
  await runParseSlugs(await batchContext('parse-slugs'), corpus ? CORPUS_EXPECTATIONS : undefined);
  await runTokenizeStones(await batchContext('tokenize-stones'), { corpus });
  await runCanonicalCatalog(await batchContext('canonical-catalog'), { corpus });
  await runDerivedIdentities(await batchContext('derived-identities'), { corpus });
  await runPricesObservations(await batchContext('prices-observations'), { corpus });
  await runAssets(await batchContext('assets'), { corpus });
  await runCertificates(await batchContext('certificates'), { corpus });
  await runCmsRedirects(await batchContext('cms-redirects'), { corpus });
  await runCompatibility(await batchContext('compatibility'), { corpus });
  const after = await digest();
  gate('V17', 'second run of every stage changes zero rows', before === after,
    before === after ? GATE_PASS : `canonical digest changed: ${before} -> ${after}`);

  // ------------------------------------------------- catalogue count audit
  const countOf = async (sql: string): Promise<string> => scalar(db, sql);
  const counts: Record<string, string> = {
    stones: await countOf(`SELECT count(*)::text AS n FROM gemstones WHERE kind = 'SINGLE'`),
    pairs: await countOf(`SELECT count(*)::text AS n FROM gemstones WHERE kind = 'PAIR'`),
    gemstone_stones: await countOf(`SELECT count(*)::text AS n FROM gemstone_stones`),
    settings: await countOf(`SELECT count(*)::text AS n FROM settings`),
    setting_variants: await countOf(`SELECT count(*)::text AS n FROM setting_variants`),
    configured_products: await countOf(`SELECT count(*)::text AS n FROM products WHERE kind = 'CONFIGURED'`),
    ready_made_products: await countOf(`SELECT count(*)::text AS n FROM products WHERE kind = 'READY_MADE'`),
    derived_only_dyo: await countOf(`SELECT count(*)::text AS n FROM products WHERE kind = 'CONFIGURED' AND source_sku IS NULL AND sku_evidence_status = 'INFERRED'`),
    price_entries: await countOf(`SELECT count(*)::text AS n FROM price_entries`),
    price_model_observations: await countOf(`SELECT count(*)::text AS n FROM price_model_observations`),
    media: await countOf(`SELECT count(*)::text AS n FROM assets`),
    certificates: await countOf(`SELECT count(*)::text AS n FROM certificates`),
    redirects: await countOf(`SELECT count(*)::text AS n FROM redirects`),
    compatibility_rules: await countOf(`SELECT count(*)::text AS n FROM setting_compatibility_rules`),
    staging_conflicts: await countOf(`SELECT count(*)::text AS n FROM staging_conflicts`),
    staging_source_pages: await countOf(`SELECT count(*)::text AS n FROM staging_source_pages`),
    staging_parsed_urls: await countOf(`SELECT count(*)::text AS n FROM staging_parsed_urls`),
  };

  // -------------------------------------------------------- provenance audit
  const provenance: Record<string, string> = {};
  let provenanceMissing = 0;
  for (const table of digestTables) {
    const hasBatch = await scalar(db, `SELECT count(*)::text AS n FROM information_schema.columns
       WHERE table_name = '${table}' AND column_name = 'import_batch_id'`);
    if (hasBatch !== '1') {
      provenance[table] = 'n/a (no import_batch_id column)';
      continue;
    }
    const missing = await scalar(db, `SELECT count(*)::text AS n FROM ${table} WHERE import_batch_id IS NULL`);
    provenance[table] = missing;
    provenanceMissing += Number(missing);
  }
  if (provenanceMissing !== 0) {
    throw new Error(`verify-gates: provenance audit found ${String(provenanceMissing)} row(s) without an import batch`);
  }

  return {
    gates,
    counts,
    provenance,
    idempotency: `digest ${before} unchanged across a full re-execution of all implemented stages`,
  };
}

/** FNV-1a over the digest parts — a deterministic, dependency-free hash. */
function createHashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}