/**
 * packages/db/src/catalog/settings-repository.ts
 *
 * Setting/variant read queries (Phase 3 task 1 read model).
 *
 * Settings are the reusable parents (doc 10 aggregate structure): designs
 * (951 + 13 INFERRED) and their variants (design × metal, 10,349 + 42
 * INFERRED). The realisation cross-product is never enumerated — the
 * listing reads designs in ascending design_code (keyset) and, for the
 * page, batches its variants in ONE `= ANY(ids)` query for the page's
 * design ids (no N+1).
 *
 * Settings listing is NOT publication-gated: settings and setting_variants
 * are catalog reference structures (record_state), not sellable products;
 * the publication gate belongs to products only (doc 10 read-model
 * boundary). Their evidence statuses travel verbatim in the DTO.
 */
import { sql, type SQL } from 'drizzle-orm';
import type { CatalogDatabase } from './executor.js';

const SETTING_ROW_COLUMNS = sql`
  s.id::text         AS id,
  s.design_code     AS design_code,
  s.name            AS name,
  s.jewellery_type::text AS jewellery_type,
  st.code           AS style_code,
  st.label          AS style_label,
  s.is_vedic        AS is_vedic,
  s.side_stone_count AS side_stone_count,
  s.state::text     AS state,
  s.source_url      AS source_url,
  s.evidence_status::text AS evidence_status,
  ib.batch_key      AS import_batch
`;

const SETTING_FILTER_JOINS = sql`
  FROM settings s
  LEFT JOIN setting_styles st ON st.id = s.style_id
  LEFT JOIN import_batches ib ON ib.id = s.import_batch_id
`;

export interface SettingListSqlPlan {
  jewelleryType: readonly string[];
  styleIds: readonly string[];
  metalCodes: readonly string[];
  vedicOnly: boolean;
  limitPlusOne: number;
  afterDesignCode: string | null;
}

/** WHERE block; every predicate rides an indexed column (settings/style/metal indexes). */
export function composeSettingsWhere(plan: SettingListSqlPlan): SQL {
  const clauses: SQL[] = [sql`s.deleted_at IS NULL`];
  if (plan.jewelleryType.length > 0) {
    clauses.push(sql`s.jewellery_type::text = ANY(${sql.param(plan.jewelleryType)}::text[])`);
  }
  if (plan.styleIds.length > 0) {
    clauses.push(sql`s.style_id::text = ANY(${sql.param(plan.styleIds)}::uuid[]::text[])`);
  }
  if (plan.metalCodes.length > 0) {
    clauses.push(sql`EXISTS (
      SELECT 1 FROM setting_variants mv
       WHERE mv.setting_id = s.id
         AND mv.deleted_at IS NULL
         AND mv.metal_code::text = ANY(${sql.param(plan.metalCodes)}::text[])
    )`);
  }
  if (plan.vedicOnly) {
    clauses.push(sql`s.is_vedic = TRUE`);
  }
  return sql`(${sql.join(clauses, sql` AND `)})`;
}

/**
 * Design listing page. Keyset on design_code (UNIQUE while not deleted;
 * the WHERE excludes deleted rows, giving the total order). LIMIT n+1 for
 * has_more. No offset, no totals.
 */
export async function runSettingList(
  db: CatalogDatabase,
  plan: SettingListSqlPlan,
): Promise<Array<Record<string, unknown>>> {
  const where = composeSettingsWhere(plan);
  const seek = plan.afterDesignCode === null
    ? sql``
    : sql` AND s.design_code > ${plan.afterDesignCode}`;
  const statement = sql`
    SELECT ${SETTING_ROW_COLUMNS}
      ${SETTING_FILTER_JOINS}
     WHERE ${where}${seek}
     ORDER BY s.design_code ASC
     LIMIT ${plan.limitPlusOne}
  `;
  const result = await db.execute(statement);
  return result.rows as unknown as Array<Record<string, unknown>>;
}

/**
 * Settings facets: single grouped statement over the FILTERED base set —
 * same WHERE composition as the page (no second filter implementation),
 * one snapshot. Dimension arms follow the closed facet dimensions the
 * settings surface exposes (doc 12): style, jewellery_type, metal.
 */
export interface SettingListFacets {
  items: Array<{ dimension: string; value: string; label: string; count: number }>;
}

export async function runSettingFacets(
  db: CatalogDatabase,
  plan: SettingListSqlPlan,
): Promise<SettingListFacets> {
  const where = composeSettingsWhere(plan);
  const statement = sql`
    WITH base AS (
      SELECT s.id, s.design_code, s.jewellery_type, s.style_id
        ${SETTING_FILTER_JOINS}
       WHERE ${where}
    ),
    f_style AS (
      SELECT 'settingStyle'::text AS dimension, st.code::text AS value, st.label::text AS label, count(*)::int AS count
        FROM base b
        LEFT JOIN setting_styles st ON st.id = b.style_id
       WHERE b.style_id IS NOT NULL
       GROUP BY 2, 3
    ),
    f_jt AS (
      SELECT 'jewellery_type'::text AS dimension, b.jewellery_type::text AS value,
             b.jewellery_type::text AS label, count(*)::int AS count
        FROM base b
       GROUP BY 2, 3
    ),
    f_metal AS (
      SELECT 'metal'::text AS dimension, m.code::text AS value, m.label::text AS label,
             count(DISTINCT b.id)::int AS count
        FROM base b
        JOIN setting_variants sv ON sv.setting_id = b.id AND sv.deleted_at IS NULL
        JOIN metals m ON m.code = sv.metal_code
       GROUP BY 2, 3
    ),
    all_facets AS (
      SELECT * FROM f_style
      UNION ALL SELECT * FROM f_jt
      UNION ALL SELECT * FROM f_metal
    )
    SELECT COALESCE((SELECT json_agg(t) FROM all_facets t), '[]'::json) AS facets
  `;
  const result = await db.execute(statement);
  const row = result.rows[0] as { facets: unknown } | undefined;
  if (row === undefined) throw new Error('[BUG] settings facet statement returned nothing');
  return { items: row.facets as SettingListFacets['items'] };
}

/** Variant row shape matching the mapper (variant + provenance). */
export interface SettingVariantRawRow {
  readonly sku: string;
  readonly slug: string;
  readonly metal: string;
  readonly base_price: number | null;
  readonly currency: string;
  readonly availability: boolean;
  readonly state: string;
  readonly source_url: string | null;
  readonly evidence_status: string;
  readonly price_evidence: string;
  readonly import_batch: string | null;
  readonly setting_id: string;
  readonly design_code: string;
}

export async function findSettingVariantsForDesigns(
  db: CatalogDatabase,
  designIds: readonly string[],
): Promise<SettingVariantRawRow[]> {
  const statement = sql`
    SELECT sv.sku AS sku,
           sv.slug AS slug,
           sv.metal_code::text AS metal,
           sv.base_price::float8 AS base_price,
           sv.currency AS currency,
           sv.availability AS availability,
           sv.state::text AS state,
           sv.source_url AS source_url,
           sv.evidence_status::text AS evidence_status,
           sv.price_evidence::text AS price_evidence,
           vib.batch_key AS import_batch,
           sv.setting_id::text AS setting_id,
           s.design_code AS design_code
      FROM setting_variants sv
      JOIN settings s ON s.id = sv.setting_id
      LEFT JOIN import_batches vib ON vib.id = sv.import_batch_id
     WHERE sv.setting_id::text = ANY(${sql.param(designIds)}::uuid[]::text[])
       AND sv.deleted_at IS NULL
     ORDER BY sv.sku ASC
  `;
  const result = await db.execute(statement);
  return result.rows as unknown as SettingVariantRawRow[];
}

/** Design detail by design_code (state-unfiltered identity lookup). */
export async function findSettingByDesignCode(
  db: CatalogDatabase,
  designCode: string,
): Promise<Record<string, unknown> | null> {
  const statement = sql`
    SELECT ${SETTING_ROW_COLUMNS}
      ${SETTING_FILTER_JOINS}
     WHERE s.design_code = ${designCode}
       AND s.deleted_at IS NULL
     LIMIT 1
  `;
  const result = await db.execute(statement);
  return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
}

/** Variant lookup by SKU (settings/{sku} surface). Returns the design_code of
 * the design the variant belongs to; the port assembles design + variants
 * through the same two queries the design-detail surface uses.
 */
export async function findSettingVariantBySku(
  db: CatalogDatabase,
  sku: string,
): Promise<Record<string, unknown> | null> {
  const statement = sql`
    SELECT s.design_code AS design_code,
           sv.sku        AS sku
      FROM setting_variants sv
      JOIN settings s ON s.id = sv.setting_id
     WHERE sv.sku = ${sku}
       AND sv.deleted_at IS NULL
     LIMIT 1
  `;
  const result = await db.execute(statement);
  return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
}

/**
 * Design detail row: the list projection plus the design description.
 * Used by both the design-detail and variant-detail surfaces.
 */
export async function findSettingDetailByDesignCode(
  db: CatalogDatabase,
  designCode: string,
): Promise<Record<string, unknown> | null> {
  const statement = sql`
    SELECT ${SETTING_ROW_COLUMNS},
           s.description AS description
      ${SETTING_FILTER_JOINS}
     WHERE s.design_code = ${designCode}
       AND s.deleted_at IS NULL
     LIMIT 1
  `;
  const result = await db.execute(statement);
  return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
}
