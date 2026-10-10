/**
 * packages/db/src/search/facets.ts
 *
 * Facet aggregation with disjunctive colour and variety counts (Phase 5 Task 9).
 *
 * Scope authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 5 Task 9:
 *     "Implement facet counts with disjunctive colour handling."
 *   - PROJECT_SOURCE_OF_TRUTH.md §11.3 & §14
 *   - technical_design/12_SEARCH_ARCHITECTURE.md §139-144:
 *     "Computed in a single grouped pass per dimension over the filtered
 *      candidate set, so facet counts always agree with the result set.
 *      Each facet returns value, count, selected. Colour and variety use
 *      disjunctive handling: selecting one colour does not zero the counts
 *      of the others."
 */
import { sql, type SQL } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import {
  buildProductsWhere,
  type FilterPlan,
  type ProductFacetDimension,
  type RawSpecFilters,
} from '../catalog/predicates.js';
import {
  FacetSetSchema,
  type FacetSet,
  type FacetValue,
} from '@maihan/contracts';
import { PRODUCT_SEARCH_JOINS } from './structured-arm.js';
import { PRODUCT_TSVECTOR_EXPR } from './fulltext-arm.js';

interface FacetArmDef {
  name: ProductFacetDimension;
  value: SQL;
  label: SQL;
  joins: SQL[];
  present: SQL;
}

const SEARCH_FACET_ARMS: readonly FacetArmDef[] = Object.freeze([
  {
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
]);

function isSelected(
  dimension: string,
  value: string,
  rawFilters?: Partial<RawSpecFilters>,
): boolean {
  if (!rawFilters) return false;
  switch (dimension) {
    case 'variety':
      return rawFilters.variety?.includes(value) ?? false;
    case 'color':
      return rawFilters.color?.includes(value) ?? false;
    case 'jewellery_type':
      return rawFilters.jewelleryType?.includes(value) ?? false;
    case 'metal':
      return rawFilters.metal?.includes(value) ?? false;
    case 'settingStyle':
      return rawFilters.settingStyle?.includes(value) ?? false;
    case 'shape':
      return rawFilters.shape?.includes(value) ?? false;
    case 'origin':
      return rawFilters.origin?.includes(value) ?? false;
    case 'treatment':
      return rawFilters.treatment?.includes(value) ?? false;
    default:
      return false;
  }
}

/**
 * Computes search facets in a single grouped pass with disjunctive handling.
 */
export async function computeSearchFacets(
  db: CatalogDatabase,
  plan: FilterPlan,
  rawFilters?: Partial<RawSpecFilters>,
  textQuery?: string,
): Promise<FacetSet> {
  const cleanQuery = (textQuery ?? '').trim();
  const ftsClause = cleanQuery.length > 0
    ? sql`(
        ${PRODUCT_TSVECTOR_EXPR} @@ websearch_to_tsquery('english', ${sql.param(cleanQuery)})
        OR (g.id IS NOT NULL AND to_tsvector('english', coalesce(g.search_document, '')) @@ websearch_to_tsquery('english', ${sql.param(cleanQuery)}))
        OR (gp.id IS NOT NULL AND to_tsvector('english', coalesce(gp.search_document, '')) @@ websearch_to_tsquery('english', ${sql.param(cleanQuery)}))
        OR (gv.id IS NOT NULL AND to_tsvector('english', coalesce(gv.name, '')) @@ websearch_to_tsquery('english', ${sql.param(cleanQuery)}))
      )`
    : null;

  // Build each arm CTE
  const armCtes = SEARCH_FACET_ARMS.map((arm) => {
    // DISJUNCTIVE HANDLING: build WHERE with THIS arm's dimension excluded
    const dimensionWhere = buildProductsWhere(plan, arm.name);
    const combinedWhere = ftsClause
      ? sql`(${dimensionWhere} AND ${ftsClause} AND ${arm.present})`
      : sql`(${dimensionWhere} AND ${arm.present})`;

    const extraJoins = arm.joins.length > 0
      ? sql.join(arm.joins, sql` `)
      : sql``;

    const cteSql = sql`
      SELECT
        ${sql.raw(`'${arm.name}'`)}::text AS dimension,
        (${arm.value})::text AS value,
        (${arm.label})::text AS label,
        count(*)::int AS count
      FROM products p
      ${PRODUCT_SEARCH_JOINS}
      ${extraJoins}
      WHERE ${combinedWhere}
      GROUP BY ${arm.value}, ${arm.label}
    `;

    return {
      name: `f_${arm.name}`,
      sql: cteSql,
    };
  });

  const unionSql = sql.join(
    armCtes.map((c) => sql`SELECT * FROM ${sql.raw(c.name)}`),
    sql` UNION ALL `,
  );

  const statement = sql`
    WITH
      ${sql.join(armCtes.map((c) => sql`${sql.raw(c.name)} AS (${c.sql})`), sql`,\n`)},
      all_facets AS (
        ${unionSql}
      )
    SELECT
      dimension,
      value,
      label,
      count
    FROM all_facets
    WHERE value IS NOT NULL
  `;

  const result = await db.execute(statement);
  const rawRows = (result.rows ?? []) as Array<{
    dimension: string;
    value: string;
    label: string;
    count: number;
  }>;

  const facetMap: Record<ProductFacetDimension, FacetValue[]> = {
    variety: [],
    color: [],
    jewellery_type: [],
    metal: [],
    settingStyle: [],
    shape: [],
    origin: [],
    treatment: [],
  };

  for (const row of rawRows) {
    const dim = row.dimension as ProductFacetDimension;
    if (dim in facetMap) {
      facetMap[dim].push({
        value: String(row.value),
        label: String(row.label),
        count: Number(row.count),
        selected: isSelected(dim, String(row.value), rawFilters),
      });
    }
  }

  // Sort each facet dimension: count DESC, value ASC
  for (const dim of Object.keys(facetMap) as ProductFacetDimension[]) {
    facetMap[dim].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.value.localeCompare(b.value);
    });
  }

  return FacetSetSchema.parse(facetMap);
}
