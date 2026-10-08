/**
 * packages/db/src/catalog/products-repository.ts
 *
 * Product read queries (Phase 3 task 1 read model + tasks 2-5 listing SQL).
 *
 * THE LISTING QUERY IS ONE STATEMENT. The candidate set (CTE `filtered`),
 * the page (CTE `page`) and EVERY facet arm (`f_*`) are resolved in a single
 * dispatch against one snapshot, so facet counts cannot contradict the
 * displayed rows: no second connection, no second snapshot, and no second
 * implementation of the predicates (predicates.ts is the only authority).
 * Each facet arm aggregates the filtered candidate set directly (doc 12:
 * "one grouped pass over the filtered set") with its own dimension's
 * predicate excluded (disjunctive colour/variety handling).
 *
 * Keyset pagination (task 4): ORDER BY <sort col>, product_number, plus a
 * strictly-ordered ROW-seek from the decoded cursor. Forward-only; has_more
 * via the limit+1 heuristic; no offset, no totals.
 *
 * Provenance (task 5): every product row carries source_url, the price and
 * SKU evidence statuses and the import batch key, read straight off the
 * Phase 2 rows — the port layer echoes evidence statuses verbatim.
 */
import { sql, type SQL } from 'drizzle-orm';
import type { CatalogDatabase } from './executor.js';
import { buildProductsWhere, isProductFacetDimension, type FilterPlan } from './predicates.js';
import {
  orderBySql,
  seekPredicateSql,
  PRODUCT_SORT_COLUMNS,
} from './query-assembly.js';
import type {
  CursorPayload,
  ProductSortKey,
  SortDirection,
} from '@maihan/contracts';

/**
 * The 1:0/1:1 join block of the products star, shared by every reader of a
 * product row so provenance columns never fork between queries. Aliased
 * columns are fixed for the mappers.
 */
const PRODUCT_STAR_JOINS = sql`
  LEFT JOIN gemstone_varieties gv ON gv.id = p.variety_id
  LEFT JOIN gemstone_colours  gc ON gc.id = p.colour_id
  LEFT JOIN setting_variants  sv ON sv.id = p.setting_variant_id
  LEFT JOIN settings           s ON s.id  = sv.setting_id
  LEFT JOIN gemstones          g ON g.id  = p.gemstone_id
  LEFT JOIN gemstones         gp ON gp.id = p.gemstone_pair_id
  LEFT JOIN import_batches    ib ON ib.id = p.import_batch_id
  LEFT JOIN metals             m ON m.code = sv.metal_code
`;

/** Summary projection — every column alias is fixed and consumed by the mapper. */
const PRODUCT_SUMMARY_COLUMNS = sql`
  p.slug             AS slug,
  p.title            AS title,
  p.subtitle         AS subtitle,
  p.kind::text       AS kind,
  p.jewellery_type::text AS jewellery_type,
  p.total_weight_ct::float8 AS total_weight_ct,
  p.stone_count      AS stone_count,
  p.price_amount::float8 AS price_amount,
  p.currency         AS currency,
  p.state::text      AS state,
  p.availability     AS availability,
  gv.slug            AS variety_slug,
  gv.name            AS variety_name,
  gc.slug            AS color_slug,
  gc.name            AS color_name,
  p.source_url       AS source_url,
  p.source_sku       AS source_sku,
  p.source_sku_derived AS source_sku_derived,
  p.price_evidence::text AS price_evidence,
  p.sku_evidence_status::text AS sku_evidence_status,
  ib.batch_key       AS import_batch
`;

export interface ProductListSqlPlan {
  filterPlan: FilterPlan;
  sortKey: ProductSortKey;
  direction: SortDirection;
  limitPlusOne: number;
  cursor: CursorPayload | null;
}

export interface ProductListRawResult {
  /** Raw summary rows, in page order, INCLUDING the has_more sentinel row. */
  items: Array<Record<string, unknown>>;
  /** Flattened facet arm rows: {dimension, value, label, count}. */
  facets: Array<{ dimension: string; value: string; label: string; count: number }>;
}

/** One facet arm definition composed by `composeProductListStatement`. */
interface FacetArmSpec {
  name: string;
  /** Facet key emitted as the `dimension` column, matching the contract's FacetSet keys. */
  value: SQL;
  label: SQL;
  /** Extra LEFT JOINs this arm needs (always 1:0/1:1; never row-multiplying). */
  joins: SQL[];
  /** Value-present predicate (keeps NULL of a LEFT JOIN out of the groups). */
  present: SQL;
}

const FACET_ARMS: FacetArmSpec[] = [
  {
    // gv is inside PRODUCT_STAR_JOINS, shared by every arm: one join set,
    // one implementation, no arm-specific alias collisions.
    name: 'variety',
    value: sql`gv.slug`,
    label: sql`gv.name`,
    joins: [],
    present: sql`p.variety_id IS NOT NULL`,
  },
  {
    name: 'color',
    value: sql`gc.slug`,
    label: sql`gc.name`,
    joins: [],
    present: sql`p.colour_id IS NOT NULL`,
  },
  {
    name: 'jewellery_type',
    value: sql`p.jewellery_type::text`,
    label: sql`p.jewellery_type::text`,
    joins: [],
    present: sql`TRUE`,
  },
  {
    name: 'metal',
    value: sql`sv.metal_code::text`,
    label: sql`m.label`,
    joins: [],
    present: sql`sv.metal_code IS NOT NULL`,
  },
  {
    name: 'settingStyle',
    value: sql`ss.code`,
    label: sql`ss.label`,
    joins: [sql`LEFT JOIN setting_styles ss ON ss.id = s.style_id`],
    present: sql`s.style_id IS NOT NULL`,
  },
  {
    name: 'shape',
    value: sql`coalesce(g.shape::text, gp.shape::text)`,
    label: sql`coalesce(g.shape::text, gp.shape::text)`,
    joins: [],
    present: sql`coalesce(g.shape, gp.shape) IS NOT NULL`,
  },
  {
    name: 'origin',
    value: sql`coalesce(og.slug, ogp.slug)`,
    label: sql`coalesce(og.name, ogp.name)`,
    joins: [
      sql`LEFT JOIN gemstone_origins og ON og.id = g.origin_id`,
      sql`LEFT JOIN gemstone_origins ogp ON ogp.id = gp.origin_id`,
    ],
    present: sql`coalesce(og.id, ogp.id) IS NOT NULL`,
  },
  {
    name: 'treatment',
    value: sql`coalesce(tr.code, trp.code)`,
    label: sql`coalesce(tr.label, trp.label)`,
    joins: [
      sql`LEFT JOIN treatments tr ON tr.id = g.treatment_id`,
      sql`LEFT JOIN treatments trp ON trp.id = gp.treatment_id`,
    ],
    present: sql`coalesce(tr.id, trp.id) IS NOT NULL`,
  },
];

/**
 * Composes the whole one-statement listing. Pure (no execution), so specs
 * can assert the composed WHERE/ORDER shapes without a database.
 */
export function composeProductListStatement(plan: ProductListSqlPlan): SQL {
  const { filterPlan, sortKey, direction, limitPlusOne, cursor } = plan;
  const sort = PRODUCT_SORT_COLUMNS[sortKey];

  const whereAll = buildProductsWhere(filterPlan, 'all');
  const seek = cursor === null ? null : seekPredicateSql(sortKey, direction, cursor);

  const armCtes = FACET_ARMS.map((arm) => facetArmCte(arm, filterPlan));
  const union = sql.join(
    armCtes.map((armCte) => sql`SELECT * FROM ${sql.raw(armCte.name)}`),
    sql` UNION ALL `,
  );

  return sql`
    WITH
      filtered AS (
        SELECT p.id AS id
          FROM products p
          ${PRODUCT_STAR_JOINS}
         WHERE ${whereAll}
      ),
      page AS (
        SELECT
          ${PRODUCT_SUMMARY_COLUMNS},
          ${sort.valueExpr} AS sort_value,
          p.product_number  AS product_number
          FROM products p
          JOIN filtered f ON f.id = p.id
          ${PRODUCT_STAR_JOINS}
         WHERE ${whereAll}${seek === null ? sql`` : sql` AND ${seek}`}
         ORDER BY ${orderBySql(sortKey, direction)}
         LIMIT ${limitPlusOne}
      ),
      ${sql.join(armCtes.map((c) => sql`${sql.raw(c.name)} AS (${c.sql})`), sql`,\n`)},
      all_facets AS (
        ${union}
      )
    SELECT
      COALESCE((SELECT json_agg(t) FROM page t), '[]'::json)      AS items,
      COALESCE((SELECT json_agg(t) FROM all_facets t), '[]'::json) AS facets
  `;
}

/**
 * Emits one facet-arm CTE:
 *
 *   f_<name> AS (
 *     SELECT '<name>'::text AS dimension, <value> AS value, <label> AS label,
 *            count(*)::int AS count
 *       FROM products p
 *       JOIN filtered f ON f.id = p.id
 *       <extra joins>
 *      WHERE p.deleted_at IS NULL
 *        AND <recomposed filter WHERE with THIS arm's dimension excluded>
 *        AND <value present>
 *      GROUP BY value, label
 *   )
 *
 * The recomposed WHERE comes from the SAME FilterPlan (single filter
 * implementation); because GROUP BY uses the value+label expression pair,
 * Postgres guarantees one counted row per value.
 */
function facetArmCte(arm: FacetArmSpec, filterPlan: FilterPlan): { name: string; sql: SQL } {
  if (arm.name !== undefined && !isProductFacetDimension(arm.name)) {
    // FACET_ARMS is a static table; this guards a future edit that adds an
    // arm name unknown to the plan builder.
    throw new Error(`[BUG] facet arm "${arm.name}" is not a PRODUCT_FACET_DIMENSIONS member`);
  }
  // The recomposed WHERE comes from the SAME FilterPlan with this arm's
  // dimension excluded (disjunctive drill-down). Predicate columns live on
  // the joined star, so every arm carries the full 1:0/1:1 join block —
  // identical to `filtered`'s, thus no aggregation fan-out is possible.
  const armWhere = buildProductsWhere(filterPlan, arm.name);
  const cteSql = sql`
        SELECT ${sql.raw(`'${arm.name}'`)}::text AS dimension,
               ${arm.value}::text AS value,
               ${arm.label}::text AS label,
               count(*)::int AS count
          FROM products p
          JOIN filtered f ON f.id = p.id
          ${PRODUCT_STAR_JOINS}
          ${arm.joins.length > 0 ? sql.join(arm.joins, sql`\n          `) : sql``}
         WHERE ${armWhere}
           AND ${arm.present}
         GROUP BY 2, 3
  `;
  return { name: `f_${arm.name}`, sql: cteSql };
}

/**
 * Executes the composed listing statement and returns raw rows for the port
 * layer's mapper. One dispatch: page + every facet arm share one snapshot.
 */
export async function runProductList(
  db: CatalogDatabase,
  plan: ProductListSqlPlan,
): Promise<ProductListRawResult> {
  const statement = composeProductListStatement(plan);
  const result = await db.execute(statement);
  const row = result.rows[0] as { items: unknown; facets: unknown } | undefined;
  if (row === undefined || row.items === undefined || row.facets === undefined) {
    throw new Error('[BUG] product listing statement returned no payload row');
  }
  return {
    items: row.items as Array<Record<string, unknown>>,
    facets: row.facets as ProductListRawResult['facets'],
  };
}

/**
 * Product-detail projection: the summary columns extended with the detail
 * set and the composed aggregate (INV-01: exactly one setting variant, and
 * one stone XOR one pair — the projection mirrors the database constraint
 * rather than re-deciding it in SQL logic).
 */
const PRODUCT_DETAIL_COLUMNS = sql`
  ${PRODUCT_SUMMARY_COLUMNS},
  p.description       AS description,
  p.short_description AS short_description,
  p.seo_title         AS seo_title,
  p.seo_description   AS seo_description,
  p.engraving_enabled AS engraving_enabled,
  sv.sku              AS setting_variant_sku,
  sv.slug             AS setting_variant_slug,
  s.design_code       AS setting_variant_design_code,
  g.gem_ref           AS gemstone_gem_ref,
  g.kind::text        AS gemstone_kind,
  g.source_url        AS gemstone_source_url,
  g.ref_evidence_status::text AS gemstone_ref_evidence,
  g.price_evidence::text AS gemstone_price_evidence,
  gib.batch_key       AS gemstone_import_batch,
  gp.gem_ref          AS gemstone_pair_gem_ref,
  gp.kind::text       AS gemstone_pair_kind,
  gp.source_url       AS gemstone_pair_source_url,
  gp.ref_evidence_status::text AS gemstone_pair_ref_evidence,
  gp.price_evidence::text AS gemstone_pair_price_evidence,
  gpib.batch_key      AS gemstone_pair_import_batch
`;

const PRODUCT_DETAIL_JOINS = sql`
  LEFT JOIN setting_variants  sv ON sv.id = p.setting_variant_id
  LEFT JOIN settings           s ON s.id  = sv.setting_id
  LEFT JOIN gemstones          g ON g.id  = p.gemstone_id
  LEFT JOIN gemstones         gp ON gp.id = p.gemstone_pair_id
  LEFT JOIN gemstone_varieties gv ON gv.id = p.variety_id
  LEFT JOIN gemstone_colours  gc ON gc.id = p.colour_id
  LEFT JOIN import_batches    ib ON ib.id = p.import_batch_id
  LEFT JOIN import_batches   gib ON gib.id = g.import_batch_id
  LEFT JOIN import_batches  gpib ON gpib.id = gp.import_batch_id
`;

/**
 * Product detail by public slug. Returns null when the slug is unknown,
 * soft-deleted, or NOT PUBLISHED (`state = 'ACTIVE'` only — the migrated
 * corpus stays DRAFT until Phase 12 curation publishes it, so unpublished
 * rows can never leak into a public identity lookup).
 */
export async function findProductDetailBySlug(
  db: CatalogDatabase,
  slug: string,
): Promise<Record<string, unknown> | null> {
  const statement = sql`
    SELECT ${PRODUCT_DETAIL_COLUMNS}
      FROM products p
      ${PRODUCT_DETAIL_JOINS}
     WHERE p.slug = ${slug}
       AND p.state = 'ACTIVE'
       AND p.deleted_at IS NULL
     LIMIT 1
  `;
  const result = await db.execute(statement);
  return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
}
