/**
 * packages/db/src/search/structured-arm.ts
 *
 * Structured retrieval arm for hybrid search (Phase 5 Task 2).
 *
 * Scope authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 5 Task 2:
 *     "Build the structured filter arm inside @maihan/db: queries against
 *      products, gemstones, setting_variants, settings. Every filter must map
 *      to an existing index or index prefix. Whitelist-validate all incoming
 *      facets against the taxonomy from Phase 1."
 *   - PROJECT_SOURCE_OF_TRUTH.md §11.3 & §14
 *   - technical_design/12_SEARCH_ARCHITECTURE.md §38-63
 */
import { sql, type SQL } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import {
  buildProductsWhere,
  type FilterPlan,
  type RawSpecFilters,
  resolveProductFilters,
} from '../catalog/predicates.js';
import {
  type FilterWhitelist,
  resolveFilterWhitelists,
} from '../catalog/whitelists.js';
import type {
  ProductSortKey,
  RejectedFilter,
  SortDirection,
} from '@maihan/contracts';
import type { SearchCandidate } from './types.js';

/** Star joins matching the indexed foreign keys on products. */
export const PRODUCT_SEARCH_JOINS = sql`
  LEFT JOIN gemstone_varieties gv ON gv.id = p.variety_id
  LEFT JOIN gemstone_colours  gc ON gc.id = p.colour_id
  LEFT JOIN setting_variants  sv ON sv.id = p.setting_variant_id
  LEFT JOIN settings           s ON s.id  = sv.setting_id
  LEFT JOIN gemstones          g ON g.id  = p.gemstone_id
  LEFT JOIN gemstones         gp ON gp.id = p.gemstone_pair_id
  LEFT JOIN import_batches    ib ON ib.id = p.import_batch_id
  LEFT JOIN metals             m ON m.code = sv.metal_code
`;

/** Projection of columns required for search scoring, summary mapping, and modifiers. */
export const PRODUCT_SEARCH_COLUMNS = sql`
  p.id::text         AS product_id,
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
  (p.variety_id IS NOT NULL) AS has_stone_type,
  p.created_at       AS created_at,
  gv.slug            AS variety_slug,
  gv.name            AS variety_name,
  gc.slug            AS color_slug,
  gc.name            AS color_name,
  p.source_url       AS source_url,
  p.source_sku       AS source_sku,
  p.source_sku_derived AS source_sku_derived,
  p.price_evidence::text AS price_evidence,
  p.sku_evidence_status::text AS sku_evidence_status,
  ib.batch_key       AS import_batch,
  EXISTS (
    SELECT 1 FROM certificates c
     WHERE c.product_id = p.id AND c.verification_status = 'VERIFIED'
  ) AS has_verified_certificate
`;

export interface StructuredArmResult {
  readonly candidates: readonly SearchCandidate[];
  readonly totalMatches: number;
  readonly plan: FilterPlan;
  readonly rejectedFilters: readonly RejectedFilter[];
}

export interface StructuredArmOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly sortKey?: ProductSortKey;
  readonly direction?: SortDirection;
}

/**
 * Resolves raw filter inputs and executes the index-backed structured query arm.
 */
export async function executeStructuredArm(
  db: CatalogDatabase,
  rawFilters: RawSpecFilters,
  options: StructuredArmOptions = {},
): Promise<StructuredArmResult> {
  // 1. Semantic resolution against taxonomy whitelist
  const { whitelist, rejected: taxonomyRejected } = await resolveFilterWhitelists(db, {
    variety: rawFilters.variety,
    color: rawFilters.color,
    intensity: rawFilters.intensity,
    clarity: rawFilters.clarity,
    treatment: rawFilters.treatment,
    origin: rawFilters.origin,
    settingStyle: rawFilters.settingStyle,
  });

  // 2. Build immutable FilterPlan
  const { plan, rejected: rangeRejected } = resolveProductFilters(rawFilters, whitelist);
  const rejectedFilters = [...taxonomyRejected, ...rangeRejected];

  // 3. Compose structured query
  const whereClause = buildProductsWhere(plan, 'all');
  const limit = Math.max(1, Math.min(options.limit ?? 200, 1000));
  const offset = Math.max(0, options.offset ?? 0);

  let orderSql = sql`p.id DESC`;
  if (options.sortKey === 'price') {
    orderSql = options.direction === 'desc'
      ? sql`p.price_amount DESC NULLS LAST, p.id DESC`
      : sql`p.price_amount ASC NULLS LAST, p.id DESC`;
  } else if (options.sortKey === 'weight') {
    orderSql = options.direction === 'desc'
      ? sql`p.total_weight_ct DESC NULLS LAST, p.id DESC`
      : sql`p.total_weight_ct ASC NULLS LAST, p.id DESC`;
  } else if (options.sortKey === 'recency') {
    orderSql = options.direction === 'desc'
      ? sql`p.created_at DESC, p.id DESC`
      : sql`p.created_at ASC, p.id DESC`;
  }

  const queryStatement = sql`
    SELECT
      ${PRODUCT_SEARCH_COLUMNS}
    FROM products p
    ${PRODUCT_SEARCH_JOINS}
    WHERE ${whereClause}
    ORDER BY ${orderSql}
    LIMIT ${sql.param(limit)}
    OFFSET ${sql.param(offset)}
  `;

  const countStatement = sql`
    SELECT count(*)::int AS count
    FROM products p
    ${PRODUCT_SEARCH_JOINS}
    WHERE ${whereClause}
  `;

  const [rowsResult, countResult] = await Promise.all([
    db.execute(queryStatement),
    db.execute(countStatement),
  ]);

  const rawRows = (rowsResult.rows ?? []) as Array<Record<string, unknown>>;
  const totalMatches = Number(countResult.rows?.[0]?.['count'] ?? 0);

  const candidates: SearchCandidate[] = rawRows.map((row) => ({
    productId: String(row['product_id']),
    structuredScore: 1.0,
    textRank: 0.0,
    trigramSimilarity: 0.0,
    semanticSimilarity: 0.0,
    row,
  }));

  return Object.freeze({
    candidates: Object.freeze(candidates),
    totalMatches,
    plan,
    rejectedFilters: Object.freeze(rejectedFilters),
  });
}
