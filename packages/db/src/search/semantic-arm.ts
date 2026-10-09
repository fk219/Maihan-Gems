/**
 * packages/db/src/search/semantic-arm.ts
 *
 * Gated semantic retrieval arm against product_embeddings (Phase 5 Task 5).
 *
 * Scope authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 5 Task 5:
 *     "Implement the semantic arm against product_embeddings, gated as specified."
 *   - PROJECT_SOURCE_OF_TRUTH.md §11.3 & §14
 *   - technical_design/12_SEARCH_ARCHITECTURE.md §77-90
 */
import { sql, type SQL } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import {
  buildProductsWhere,
  type FilterPlan,
} from '../catalog/predicates.js';
import type { SearchIntentType } from '@maihan/domain';
import {
  PRODUCT_SEARCH_JOINS,
  PRODUCT_SEARCH_COLUMNS,
} from './structured-arm.js';
import type { SearchCandidate } from './types.js';

export interface SemanticGatingDecision {
  readonly enabled: boolean;
  readonly reason:
    | 'EXPLICITLY_DISABLED'
    | 'NAVIGATIONAL_OR_IDENTIFIER_QUERY'
    | 'STRUCTURED_CANDIDATE_OVERFLOW'
    | 'CIRCUIT_BREAKER_OPEN'
    | 'DESCRIPTIVE_WITH_LOW_CONSTRAINTS';
}

/**
 * Gating conditions from technical_design/12_SEARCH_ARCHITECTURE.md §77-86:
 *   Disabled when:
 *     1. semantic=false in request
 *     2. query is navigational (exact variety or SKU match)
 *     3. structured arm already returns > limit * 20 candidates
 *     4. circuit breaker is open
 *   Enabled when:
 *     Descriptive intent with few structured constraints.
 */
export function evaluateSemanticGating(input: {
  readonly semanticRequested?: boolean;
  readonly intentType: SearchIntentType;
  readonly structuredCandidateCount: number;
  readonly limit: number;
  readonly circuitBreakerOpen?: boolean;
}): SemanticGatingDecision {
  if (input.circuitBreakerOpen === true) {
    return { enabled: false, reason: 'CIRCUIT_BREAKER_OPEN' };
  }
  if (input.semanticRequested === false) {
    return { enabled: false, reason: 'EXPLICITLY_DISABLED' };
  }
  if (input.intentType === 'IDENTIFIER_LOOKUP' || input.intentType === 'NAVIGATIONAL') {
    return { enabled: false, reason: 'NAVIGATIONAL_OR_IDENTIFIER_QUERY' };
  }
  if (input.structuredCandidateCount > input.limit * 20) {
    return { enabled: false, reason: 'STRUCTURED_CANDIDATE_OVERFLOW' };
  }
  return { enabled: true, reason: 'DESCRIPTIVE_WITH_LOW_CONSTRAINTS' };
}

export interface SemanticArmOptions {
  readonly filterPlan?: FilterPlan;
  readonly limit?: number;
  readonly minSimilarity?: number;
}

export interface SemanticArmResult {
  readonly candidates: readonly SearchCandidate[];
  readonly totalMatches: number;
}

/** Formats a numeric array or Float32Array into a PostgreSQL vector string literal. */
export function formatPgVector(vec: readonly number[] | Float32Array): string {
  const parts: string[] = [];
  for (let i = 0; i < vec.length; i++) {
    parts.push(vec[i]!.toString());
  }
  return `[${parts.join(',')}]`;
}

/**
 * Executes vector cosine similarity search against product_embeddings.
 */
export async function executeSemanticArm(
  db: CatalogDatabase,
  queryVector: readonly number[] | Float32Array,
  options: SemanticArmOptions = {},
): Promise<SemanticArmResult> {
  if (!queryVector || queryVector.length === 0) {
    return Object.freeze({
      candidates: Object.freeze([]),
      totalMatches: 0,
    });
  }

  const vectorLiteral = formatPgVector(queryVector);
  const vectorSql = sql`${vectorLiteral}::vector(1024)`;
  const minSimilarity = options.minSimilarity ?? 0.0;
  const limit = Math.max(1, Math.min(options.limit ?? 24, 100));

  const whereClauses: SQL[] = [
    sql`p.deleted_at IS NULL`,
    sql`p.state = 'ACTIVE'`,
    sql`(1 - (pe.embedding <=> ${vectorSql})) >= ${sql.param(minSimilarity)}`,
  ];

  if (options.filterPlan) {
    whereClauses.push(buildProductsWhere(options.filterPlan, 'all'));
  }

  const whereCombined = sql`(${sql.join(whereClauses, sql` AND `)})`;

  const queryStatement = sql`
    SELECT
      (1 - (pe.embedding <=> ${vectorSql}))::float8 AS semantic_similarity,
      ${PRODUCT_SEARCH_COLUMNS}
    FROM product_embeddings pe
    JOIN products p ON p.id = pe.product_id
    ${PRODUCT_SEARCH_JOINS}
    WHERE ${whereCombined}
    ORDER BY pe.embedding <=> ${vectorSql} ASC
    LIMIT ${sql.param(limit)}
  `;

  const rowsResult = await db.execute(queryStatement);
  const rawRows = (rowsResult.rows ?? []) as Array<Record<string, unknown>>;

  const candidates: SearchCandidate[] = rawRows.map((row) => ({
    productId: String(row['product_id']),
    structuredScore: 1.0,
    textRank: 0.0,
    trigramSimilarity: 0.0,
    semanticSimilarity: Math.max(0.0, Math.min(1.0, Number(row['semantic_similarity'] ?? 0.0))),
    row,
  }));

  return Object.freeze({
    candidates: Object.freeze(candidates),
    totalMatches: candidates.length,
  });
}
