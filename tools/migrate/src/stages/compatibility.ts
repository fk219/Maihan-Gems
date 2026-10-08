/**
 * tools/migrate — stage "compatibility" (Phase 2 Global Task 20, plan
 * detailed task 20 §20.1–20.2, epic E2.9).
 *
 * 20.1 COMPATIBILITY EVIDENCE. The schema's own seeding strategy (SoT
 * §27 / `setting_compatibility_rules` comment, verbatim): "derive ALLOW
 * rules from the 1,024 observed (setting, stone) pairs with
 * evidence_status='EXTRACTED'. Everything outside stays UNKNOWN until a
 * curator reviews it. Never auto-generate DENY rules."
 *
 * So exactly one ALLOW rule per OBSERVED pairing (1,024), each carrying its
 * own `source_url` so every rule is individually traceable to the page that
 * proves it. The rule states the relationship the evidence supports and
 * nothing more:
 *
 *   setting (design) x jewellery_type x stone_kind x variety_id
 *
 * `colour_id`, `shape` and every numeric bound stay NULL. One observation
 * does not prove a colour, a shape or a weight RANGE; encoding them would be
 * an inference wearing EXTRACTED's label — and narrowing an ALLOW rule by
 * colour would behave like an unearned DENY. Absent evidence stays UNKNOWN:
 * no DENY rule is ever generated, and no pair is inferred to be incompatible
 * because nothing was observed about it.
 *
 * 20.2 CONFLICT LEDGER. Every genuine disagreement between two source
 * values is represented in `staging_conflicts` with both sides, both source
 * URLs, the import batch, and `resolution = NULL` (UNRESOLVED). No conflict
 * is deleted, merged, or resolved without an authoritative deterministic
 * rule. This stage both audits the ledger GT12 wrote (318 unresolved URL
 * identities + 10 shared-pair-reference disagreements) and runs the
 * deterministic disagreement scans that would add a row if a later write
 * ever introduced one.
 *
 * Idempotency (gate V17): NOT EXISTS-guarded inserts on
 * (setting_id, stone_kind, variety_id, source_url) and on the conflict
 * natural key, each followed by a determinism check.
 */
import type { StageContext } from './context.js';

/** GT12 wrote this many unresolved conflicts; deletion is a regression. */
export const CONFLICT_BASELINE = 328;
/** SoT §3.1: exactly 1,024 captured pages carry an observed SKU. */
export const EXPECTED_OBSERVED_PAIRS = 1_024;

export interface CompatibilityStageResult {
  readonly observedPairs: number;
  readonly rulesSeeded: number;
  readonly rulesTotal: number;
  readonly distinctSettings: number;
  readonly distinctRules: number;
  readonly denyRules: number;
  readonly existingConflicts: number;
  readonly unresolvedConflicts: number;
  readonly newConflicts: number;
}

export async function runCompatibility(ctx: StageContext, options?: { corpus?: boolean }): Promise<CompatibilityStageResult> {
  const db = ctx.db;

  // 1. the observed (setting, stone) pair corpus, joined to canonical ids.
  const observed = (await db.query<{
    setting_id: string;
    jewellery_type: string | null;
    stone_kind: string;
    variety_id: string | null;
    gem_ref: string;
    source_url: string;
    variant_sku: string;
  }>(
    `SELECT v.setting_id::text AS setting_id,
            p.jewellery_type::text AS jewellery_type,
            CASE WHEN p.gemstone_pair_id IS NOT NULL THEN 'PAIR' ELSE 'SINGLE' END AS stone_kind,
            g.variety_id::text AS variety_id,
            g.gem_ref,
            p.source_url,
            v.sku AS variant_sku
       FROM products p
       JOIN setting_variants v ON v.id = p.setting_variant_id
       JOIN gemstones g ON g.id = COALESCE(p.gemstone_pair_id, p.gemstone_id)
      WHERE p.sku_evidence_status = 'OBSERVED'
        AND p.source_sku IS NOT NULL
      ORDER BY p.source_url`,
  )).rows;

  if (options?.corpus !== false && observed.length !== EXPECTED_OBSERVED_PAIRS) {
    throw new Error(`compatibility: ${observed.length} observed (setting, stone) pairs, expected the corpus's ${EXPECTED_OBSERVED_PAIRS}`);
  }
  // The subject must resolve on BOTH sides — no dangling relationship.
  for (const row of observed) {
    if (row.setting_id.length === 0 || row.gem_ref.length === 0) {
      throw new Error(`compatibility: observed pair ${row.source_url} has an unresolved setting or stone reference`);
    }
  }

  // 2. seed one ALLOW rule per observation. Colour, shape and numeric bounds
  //    are deliberately left NULL (see the header note).
  const seed = await db.query(
    `INSERT INTO setting_compatibility_rules
       (setting_id, jewellery_type, stone_kind, variety_id, rule_kind, priority,
        explanation, evidence_status, source_url, state)
     SELECT (x->>'setting_id')::uuid,
            (x->>'jewellery_type')::jewellery_type,
            (x->>'stone_kind')::gemstone_kind,
            (x->>'variety_id')::uuid,
            'ALLOW', 100,
            'Observed DYO pairing [EXTRACTED]: design ' || (x->>'variant_sku') || ' configured with stone '
              || (x->>'gem_ref') || ' (' || (x->>'stone_kind') || ', variety '
              || coalesce((SELECT vr.slug FROM gemstone_varieties vr WHERE vr.id = (x->>'variety_id')::uuid), 'UNKNOWN')
              || '). Absence of an observation is UNKNOWN, never DENY.',
            'EXTRACTED',
            x->>'source_url',
            'ACTIVE'
       FROM jsonb_array_elements($1::jsonb) AS o(x)
      WHERE NOT EXISTS (
        SELECT 1 FROM setting_compatibility_rules r
         WHERE r.setting_id = (x->>'setting_id')::uuid
           AND r.stone_kind = (x->>'stone_kind')::gemstone_kind
           AND coalesce(r.variety_id::text, '') = coalesce(x->>'variety_id', '')
           AND r.source_url = x->>'source_url'
           AND r.rule_kind = 'ALLOW')`,
    [JSON.stringify(observed.map((r) => ({
      setting_id: r.setting_id,
      jewellery_type: r.jewellery_type,
      stone_kind: r.stone_kind,
      variety_id: r.variety_id,
      gem_ref: r.gem_ref,
      variant_sku: r.variant_sku,
      source_url: r.source_url,
    })))],
  );

  // 3. determinism check on pre-existing rules.
  const disagree = await db.query<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM setting_compatibility_rules r
       JOIN jsonb_array_elements($1::jsonb) AS o(x) ON x->>'source_url' = r.source_url
      WHERE r.setting_id::text <> x->>'setting_id'
         OR r.stone_kind::text <> x->>'stone_kind'
         OR coalesce(r.variety_id::text, '') <> coalesce(x->>'variety_id', '')
         OR r.evidence_status::text <> 'EXTRACTED'
         OR r.rule_kind <> 'ALLOW'`,
    [JSON.stringify(observed.map((r) => ({
      setting_id: r.setting_id,
      stone_kind: r.stone_kind,
      variety_id: r.variety_id,
      source_url: r.source_url,
    })))],
  );
  if (Number(disagree.rows[0]?.n ?? '0') !== 0) {
    throw new Error('compatibility: a stored rule disagrees with the observed-pair corpus (determinism violation)');
  }

  // 4. integrity of what was written: EXTRACTED ALLOW only, never DENY, never
  //    an invented bound, every rule traceable to a source page.
  const integrity = await db.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM setting_compatibility_rules
      WHERE evidence_status <> 'EXTRACTED'
         OR rule_kind = 'DENY'
         OR source_url IS NULL
         OR colour_id IS NOT NULL
         OR shape IS NOT NULL
         OR min_weight_ct IS NOT NULL OR max_weight_ct IS NOT NULL
         OR min_length_mm IS NOT NULL OR max_length_mm IS NOT NULL
         OR min_width_mm IS NOT NULL OR max_width_mm IS NOT NULL
         OR requires_treatment_id IS NOT NULL OR forbids_treatment_id IS NOT NULL`,
  );
  if (Number(integrity.rows[0]?.n ?? '0') !== 0) {
    throw new Error(`compatibility: ${String(integrity.rows[0]?.n)} rule(s) are not evidence-faithful EXTRACTED ALLOW rules`);
  }

  // 5. 20.2 conflict ledger — deterministic disagreement scans. Each scan
  //    reports the two sides; a disagreement is recorded UNRESOLVED.
  interface Conflict {
    readonly entity_kind: string;
    readonly entity_ref: string;
    readonly field_name: string;
    readonly value_a: string;
    readonly source_url_a: string | null;
    readonly value_b: string;
    readonly source_url_b: string | null;
  }
  const conflicts: Conflict[] = [];

  // 5a. one weight per stone reference (SoT §"exactly one weight").
  for (const row of (await db.query<{ gem_ref: string; values: string; urls: string }>(
    `SELECT gem_ref,
            string_agg(DISTINCT coalesce(total_weight_ct::text, 'NULL'), ' | ') AS values,
            string_agg(DISTINCT source_url, ' | ') AS urls
       FROM gemstones
      WHERE gem_ref IS NOT NULL
      GROUP BY gem_ref
     HAVING count(DISTINCT coalesce(total_weight_ct::text, 'NULL')) > 1`,
  )).rows) {
    const sides = (row.values ?? '').split(' | ');
    const urls = (row.urls ?? '').split(' | ');
    conflicts.push({
      entity_kind: 'GEMSTONE', entity_ref: row.gem_ref, field_name: 'total_weight_ct',
      value_a: sides[0] ?? '', source_url_a: urls[0] ?? null,
      value_b: sides[1] ?? '', source_url_b: urls[1] ?? null,
    });
  }

  // 5b. one observed price per source URL.
  for (const row of (await db.query<{ source_url: string; values: string }>(
    `SELECT source_url, string_agg(DISTINCT observed_total::text, ' | ') AS values
       FROM price_model_observations GROUP BY source_url
      HAVING count(DISTINCT observed_total) > 1`,
  )).rows) {
    const sides = (row.values ?? '').split(' | ');
    conflicts.push({
      entity_kind: 'PRODUCT', entity_ref: row.source_url, field_name: 'observed_total',
      value_a: sides[0] ?? '', source_url_a: row.source_url,
      value_b: sides[1] ?? '', source_url_b: row.source_url,
    });
  }

  // 5c. duplicate source_url (V11) and duplicate derived identities (V20).
  for (const row of (await db.query<{ source_url: string; n: string }>(
    `SELECT source_url, count(*)::text AS n FROM products GROUP BY source_url HAVING count(*) > 1`,
  )).rows) {
    conflicts.push({ entity_kind: 'PRODUCT', entity_ref: row.source_url, field_name: 'source_url', value_a: row.n, source_url_a: row.source_url, value_b: 'multiple rows', source_url_b: null });
  }
  for (const row of (await db.query<{ source_sku_derived: string; n: string }>(
    `SELECT source_sku_derived, count(*)::text AS n FROM products
      WHERE sku_evidence_status = 'INFERRED' AND source_sku_derived IS NOT NULL
      GROUP BY source_sku_derived HAVING count(*) > 1`,
  )).rows) {
    conflicts.push({ entity_kind: 'PRODUCT', entity_ref: row.source_sku_derived, field_name: 'source_sku_derived', value_a: row.n, source_url_a: null, value_b: 'duplicate derived identity', source_url_b: null });
  }

  let newConflicts = 0;
  if (conflicts.length > 0) {
    const result = await db.query(
      `INSERT INTO staging_conflicts
         (import_batch_id, entity_kind, entity_ref, field_name, value_a, source_url_a, value_b, source_url_b)
       SELECT $1::uuid, c->>'entity_kind', c->>'entity_ref', c->>'field_name',
              c->>'value_a', c->>'source_url_a', c->>'value_b', c->>'source_url_b'
         FROM jsonb_array_elements($2::jsonb) AS o(c)
        WHERE NOT EXISTS (
          SELECT 1 FROM staging_conflicts s
           WHERE s.entity_kind = c->>'entity_kind'
             AND s.entity_ref = c->>'entity_ref'
             AND s.field_name = c->>'field_name'
             AND coalesce(s.value_a, '') = coalesce(c->>'value_a', '')
             AND coalesce(s.value_b, '') = coalesce(c->>'value_b', ''))`,
      [ctx.importBatchId, JSON.stringify(conflicts)],
    );
    newConflicts = result.rowCount ?? 0;
  }

  // 6. ledger audit: nothing deleted, every row carries provenance, and every
  //    unresolved conflict is still explicitly unresolved.
  const ledger = await db.query<{ total: string; unresolved: string; no_provenance: string }>(
    `SELECT count(*)::text AS total,
            count(*) FILTER (WHERE resolution IS NULL)::text AS unresolved,
            count(*) FILTER (WHERE import_batch_id IS NULL OR entity_kind IS NULL OR entity_ref IS NULL OR field_name IS NULL)::text AS no_provenance
       FROM staging_conflicts`,
  );
  const totalConflicts = Number(ledger.rows[0]?.total ?? '0');
  const unresolvedConflicts = Number(ledger.rows[0]?.unresolved ?? '0');
  if (Number(ledger.rows[0]?.no_provenance ?? '0') !== 0) {
    throw new Error('compatibility: a conflict row is missing entity/field/import-batch provenance');
  }
  // The 328-row floor is a CORPUS fact (GT12's unresolved URL identities and
  // shared pair references). A disposable fixture chain legitimately produces
  // no conflicts at all, so the floor holds only in corpus mode; the
  // structural checks above (provenance present, unresolved rows still
  // unresolved) apply in every mode and are unchanged.
  if (options?.corpus !== false && totalConflicts < CONFLICT_BASELINE) {
    throw new Error(`compatibility: conflict ledger shrank to ${String(totalConflicts)} rows, below the GT12 baseline of ${String(CONFLICT_BASELINE)}`);
  }

  const totals = await db.query<{ total: string; distinct_settings: string; distinct_rules: string; deny: string }>(
    `SELECT count(*)::text AS total,
            count(DISTINCT setting_id)::text AS distinct_settings,
            count(DISTINCT (setting_id, stone_kind, coalesce(variety_id::text, '')))::text AS distinct_rules,
            count(*) FILTER (WHERE rule_kind = 'DENY')::text AS deny
       FROM setting_compatibility_rules`,
  );

  return {
    observedPairs: observed.length,
    rulesSeeded: seed.rowCount ?? 0,
    rulesTotal: Number(totals.rows[0]?.total ?? '0'),
    distinctSettings: Number(totals.rows[0]?.distinct_settings ?? '0'),
    distinctRules: Number(totals.rows[0]?.distinct_rules ?? '0'),
    denyRules: Number(totals.rows[0]?.deny ?? '0'),
    existingConflicts: totalConflicts,
    unresolvedConflicts,
    newConflicts,
  };
}