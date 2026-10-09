/**
 * packages/db/src/search/fulltext-arm.ts
 *
 * Full-text search retrieval arm (Phase 5 Task 3).
 *
 * Scope authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 5 Task 3:
 *     "Implement the full-text arm using websearch_to_tsquery and ts_rank_cd."
 *   - PROJECT_SOURCE_OF_TRUTH.md §11.3 & §14
 *   - technical_design/12_SEARCH_ARCHITECTURE.md §64-72
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

/** Product tsvector matching the GIN expression index on products table. */
export const PRODUCT_TSVECTOR_EXPR = sql`
  to_tsvector('english',
    coalesce(p.title, '') || ' ' ||
    coalesce(p.subtitle, '') || ' ' ||
    coalesce(p.short_description, '')
  )
`;

export interface FullTextArmOptions {
  readonly filterPlan?: FilterPlan;
  readonly limit?: number;
  readonly offset?: number;
}

export interface FullTextArmResult {
  readonly candidates: readonly SearchCandidate[];
  readonly totalMatches: number;
  readonly queryUsed: string;
}

/**
 * Executes PostgreSQL full-text search with websearch_to_tsquery and ts_rank_cd (normalization 32).
 */
export async function executeFullTextArm(
  db: CatalogDatabase,
  queryText: string,
  options: FullTextArmOptions = {},
): Promise<FullTextArmResult> {
  const cleanQuery = (queryText ?? '').trim();
  if (cleanQuery.length === 0) {
    return Object.freeze({
      candidates: Object.freeze([]),
      totalMatches: 0,
      queryUsed: '',
    });
  }

  const tsquerySql = sql`websearch_to_tsquery('english', ${sql.param(cleanQuery)})`;

  // Clauses enforcing publication and full-text match
  const whereClauses: SQL[] = [
    sql`p.deleted_at IS NULL`,
    sql`p.state = 'ACTIVE'`,
    sql`(
      ${PRODUCT_TSVECTOR_EXPR} @@ ${tsquerySql}
      OR (g.id IS NOT NULL AND to_tsvector('english', coalesce(g.search_document, '')) @@ ${tsquerySql})
      OR (gp.id IS NOT NULL AND to_tsvector('english', coalesce(gp.search_document, '')) @@ ${tsquerySql})
      OR (gv.id IS NOT NULL AND to_tsvector('english', coalesce(gv.name, '')) @@ ${tsquerySql})
    )`,
  ];

  // If a structured FilterPlan is supplied, intersect with it
  if (options.filterPlan) {
    whereClauses.push(buildProductsWhere(options.filterPlan, 'all'));
  }

  const whereCombined = sql`(${sql.join(whereClauses, sql` AND `)})`;

  // Rank with cover density (normalization 32: rank divided by document length)
  const rankExpr = sql`ts_rank_cd(${PRODUCT_TSVECTOR_EXPR}, ${tsquerySql}, 32)`;

  const limit = Math.max(1, Math.min(options.limit ?? 200, 1000));
  const offset = Math.max(0, options.offset ?? 0);

  const queryStatement = sql`
    SELECT
      ${rankExpr}::float8 AS text_rank,
      ${PRODUCT_SEARCH_COLUMNS}
    FROM products p
    ${PRODUCT_SEARCH_JOINS}
    WHERE ${whereCombined}
    ORDER BY text_rank DESC, p.id DESC
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
    textRank: Number(row['text_rank'] ?? 0.0),
    trigramSimilarity: 0.0,
    semanticSimilarity: 0.0,
    row,
  }));

  return Object.freeze({
    candidates: Object.freeze(candidates),
    totalMatches,
    queryUsed: cleanQuery,
  });
}
