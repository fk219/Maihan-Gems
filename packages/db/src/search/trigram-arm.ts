/**
 * packages/db/src/search/trigram-arm.ts
 *
 * Trigram typo-tolerance retrieval arm (Phase 5 Task 4).
 *
 * Scope authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 5 Task 4:
 *     "Implement the trigram fallback on gem_ref, title and variety name."
 *   - PROJECT_SOURCE_OF_TRUTH.md §11.3 & §14
 *   - technical_design/12_SEARCH_ARCHITECTURE.md §73-76:
 *     "pg_trgm on gem_ref, products.title and gemstone_varieties.name,
 *      similarity threshold 0.3, used when the full-text arm returns nothing.
 *      This handles single-token misspellings: tsavorite -> tsavorite garnet,
 *      aquamarinn -> aquamarine."
 */
import { sql, type SQL } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import {
  buildProductsWhere,
  type FilterPlan,
} from '../catalog/predicates.js';
import {
  PRODUCT_SEARCH_JOINS,
  PRODUCT_SEARCH_COLUMNS,
} from './structured-arm.js';
import type { SearchCandidate } from './types.js';

export const DEFAULT_TRIGRAM_THRESHOLD = 0.3;

export interface TrigramArmOptions {
  readonly filterPlan?: FilterPlan;
  readonly limit?: number;
  readonly offset?: number;
  readonly threshold?: number;
}

export interface TrigramArmResult {
  readonly candidates: readonly SearchCandidate[];
  readonly totalMatches: number;
  readonly thresholdUsed: number;
}

/**
 * Executes trigram similarity search against title, variety name, and gem_ref.
 */
export async function executeTrigramArm(
  db: CatalogDatabase,
  queryText: string,
  options: TrigramArmOptions = {},
): Promise<TrigramArmResult> {
  const cleanQuery = (queryText ?? '').trim();
  if (cleanQuery.length === 0) {
    return Object.freeze({
      candidates: Object.freeze([]),
      totalMatches: 0,
      thresholdUsed: DEFAULT_TRIGRAM_THRESHOLD,
    });
  }

  const threshold = Math.max(0.1, Math.min(options.threshold ?? DEFAULT_TRIGRAM_THRESHOLD, 1.0));
  const queryParam = sql.param(cleanQuery);
  const thresholdParam = sql.param(threshold);

  const similarityExpr = sql`
    GREATEST(
      similarity(p.title, ${queryParam}),
      coalesce(similarity(gv.name, ${queryParam}), 0.0),
      coalesce(similarity(g.gem_ref, ${queryParam}), 0.0),
      coalesce(similarity(gp.gem_ref, ${queryParam}), 0.0)
    )
  `;

  const whereClauses: SQL[] = [
    sql`p.deleted_at IS NULL`,
    sql`p.state = 'ACTIVE'`,
    sql`(
      similarity(p.title, ${queryParam}) >= ${thresholdParam}
      OR (gv.name IS NOT NULL AND similarity(gv.name, ${queryParam}) >= ${thresholdParam})
      OR (g.gem_ref IS NOT NULL AND similarity(g.gem_ref, ${queryParam}) >= ${thresholdParam})
      OR (gp.gem_ref IS NOT NULL AND similarity(gp.gem_ref, ${queryParam}) >= ${thresholdParam})
    )`,
  ];

  if (options.filterPlan) {
    whereClauses.push(buildProductsWhere(options.filterPlan, 'all'));
  }

  const whereCombined = sql`(${sql.join(whereClauses, sql` AND `)})`;

  const limit = Math.max(1, Math.min(options.limit ?? 50, 500));
  const offset = Math.max(0, options.offset ?? 0);

  const queryStatement = sql`
    SELECT
      ${similarityExpr}::float8 AS trigram_similarity,
      ${PRODUCT_SEARCH_COLUMNS}
    FROM products p
    ${PRODUCT_SEARCH_JOINS}
    WHERE ${whereCombined}
    ORDER BY trigram_similarity DESC, p.id DESC
    LIMIT ${sql.param(limit)}
    OFFSET ${sql.param(offset)}
  `;

  const countStatement = sql`
    SELECT count(*)::int AS count
    FROM products p
    ${PRODUCT_SEARCH_JOINS}
    WHERE ${whereCombined}
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
    trigramSimilarity: Number(row['trigram_similarity'] ?? 0.0),
    semanticSimilarity: 0.0,
    row,
  }));

  return Object.freeze({
    candidates: Object.freeze(candidates),
    totalMatches,
    thresholdUsed: threshold,
  });
}
