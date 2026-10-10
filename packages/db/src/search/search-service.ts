/**
 * packages/db/src/search/search-service.ts
 *
 * Full hybrid search orchestration service implementing the Search Port methods:
 *   - search(query)
 *   - suggest(query)
 *   - similarGemstones(gemRef, limit)
 *
 * Scope authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 5
 *   - PROJECT_SOURCE_OF_TRUTH.md §11.3 & §14
 *   - technical_design/12_SEARCH_ARCHITECTURE.md
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import {
  type SearchQuery,
  type SearchResult,
  type SearchSuggestQuery,
  type SearchSuggestResult,
  type SimilarGemstonesResult,
  type SearchStrategy,
  SearchQuerySchema,
  SearchSuggestQuerySchema,
  SimilarGemstonesQuerySchema,
} from '@maihan/contracts';
import {
  detectSearchIntent,
  expandQueryWithSynonyms,
  rankCandidates,
  type CandidateRankingSignals,
} from '@maihan/domain';
import type { RawSpecFilters } from '../catalog/predicates.js';
import { mapProductSummaries } from '../catalog/mappers.js';
import { executeStructuredArm, PRODUCT_SEARCH_JOINS, PRODUCT_SEARCH_COLUMNS } from './structured-arm.js';
import { executeFullTextArm } from './fulltext-arm.js';
import { executeTrigramArm } from './trigram-arm.js';
import { evaluateSemanticGating, executeSemanticArm } from './semantic-arm.js';
import { computeSearchFacets } from './facets.js';
import type { SearchCandidate } from './types.js';
import { VectorCircuitBreaker, defaultVectorCircuitBreaker } from './circuit-breaker.js';

export interface SearchExecutionOptions {
  readonly queryVector?: readonly number[] | Float32Array;
  readonly isCircuitBreakerOpen?: () => boolean;
  readonly circuitBreaker?: VectorCircuitBreaker;
}

export async function executeSearch(
  db: CatalogDatabase,
  rawQuery: SearchQuery,
  options?: SearchExecutionOptions,
): Promise<SearchResult> {
  const query = SearchQuerySchema.parse(rawQuery);
  const rawText = query.query.trim();

  // 1. Detect query intent deterministically
  const intent = detectSearchIntent(rawText);

  // 2. Merge extracted filters with explicit filter input
  const mergedFilters: RawSpecFilters = {
    kind: query.filters.kind ?? (intent.extractedFilters.kind ? [...intent.extractedFilters.kind] : []),
    jewelleryType: query.filters.jewelleryType ?? (intent.extractedFilters.jewelleryType ? [...intent.extractedFilters.jewelleryType] : []),
    gemstoneKind: query.filters.gemstoneKind ?? [],
    variety: query.filters.variety ?? (intent.extractedFilters.variety ? [...intent.extractedFilters.variety] : []),
    color: query.filters.color ?? (intent.extractedFilters.color ? [...intent.extractedFilters.color] : []),
    intensity: query.filters.intensity ?? [],
    clarity: query.filters.clarity ?? [],
    treatment: query.filters.treatment ?? (intent.extractedFilters.treatment ? [...intent.extractedFilters.treatment] : []),
    origin: query.filters.origin ?? [],
    shape: query.filters.shape ?? (intent.extractedFilters.shape ? [...intent.extractedFilters.shape] : []),
    metal: query.filters.metal ?? (intent.extractedFilters.metal ? [...intent.extractedFilters.metal] : []),
    settingStyle: query.filters.settingStyle ?? [],
    certified: query.filters.certified ?? intent.extractedFilters.certified ?? false,
    available: query.filters.available ?? false,
    minPrice: query.filters.minPrice ?? intent.extractedFilters.minPrice,
    maxPrice: query.filters.maxPrice ?? intent.extractedFilters.maxPrice,
    minWeightCt: query.filters.minWeightCt ?? intent.extractedFilters.minWeightCt,
    maxWeightCt: query.filters.maxWeightCt ?? intent.extractedFilters.maxWeightCt,
  };

  // 3. Check exact identifier lookup first
  if (intent.type === 'IDENTIFIER_LOOKUP' && intent.detectedIdentifier) {
    const id = intent.detectedIdentifier;
    const identifierStatement = sql`
      SELECT
        ${PRODUCT_SEARCH_COLUMNS}
      FROM products p
      ${PRODUCT_SEARCH_JOINS}
      WHERE p.deleted_at IS NULL
        AND p.state = 'ACTIVE'
        AND (
          p.source_sku = ${id}
          OR p.slug = ${rawText.toLowerCase()}
          OR g.gem_ref = ${id}
          OR gp.gem_ref = ${id}
          OR sv.sku = ${id}
        )
      LIMIT ${query.limit}
    `;

    const res = await db.execute(identifierStatement);
    const rows = (res.rows ?? []) as Array<Record<string, unknown>>;
    const items = mapProductSummaries(rows);

    const { plan, rejectedFilters } = await executeStructuredArm(db, mergedFilters, { limit: 1 });
    const facets = await computeSearchFacets(db, plan, mergedFilters);

    return {
      items,
      facets,
      rejected_filters: rejectedFilters as any,
      meta: {
        limit: query.limit,
        has_more: false,
        next_cursor: null,
        search_version: 'search-v1',
        strategy: 'EXACT_IDENTIFIER',
        intent: intent.type,
        degraded: false,
        candidate_count: items.length,
      },
    };
  }

  // 4. Retrieve structured candidates
  const structuredResult = await executeStructuredArm(db, mergedFilters, {
    limit: query.limit * 4,
    sortKey: query.sort === 'relevance' ? undefined : (query.sort as any),
    direction: query.direction,
  });

  const candidatesMap = new Map<string, SearchCandidate>();
  for (const c of structuredResult.candidates) {
    candidatesMap.set(c.productId, c);
  }

  let strategy: SearchStrategy = 'STRUCTURED_ONLY';

  // 5. Full-text search with synonyms
  const synonymResult = expandQueryWithSynonyms(intent.residualQuery);
  const textQueryToRun = synonymResult.expandedQuery.trim();

  if (textQueryToRun.length > 0) {
    strategy = 'FULLTEXT_HYBRID';
    const ftsResult = await executeFullTextArm(db, textQueryToRun, {
      filterPlan: structuredResult.plan,
      limit: query.limit * 3,
    });

    for (const c of ftsResult.candidates) {
      const existing = candidatesMap.get(c.productId);
      if (existing) {
        candidatesMap.set(c.productId, { ...existing, textRank: c.textRank });
      } else {
        candidatesMap.set(c.productId, c);
      }
    }

    // 6. Trigram fallback if FTS found 0 matches
    if (ftsResult.candidates.length === 0) {
      const trigramResult = await executeTrigramArm(db, intent.residualQuery, {
        filterPlan: structuredResult.plan,
        limit: query.limit * 2,
      });

      if (trigramResult.candidates.length > 0) {
        strategy = 'TRIGRAM_FALLBACK';
        for (const c of trigramResult.candidates) {
          const existing = candidatesMap.get(c.productId);
          if (existing) {
            candidatesMap.set(c.productId, { ...existing, trigramSimilarity: c.trigramSimilarity });
          } else {
            candidatesMap.set(c.productId, c);
          }
        }
      }
    }
  }

  // 7. Gated semantic search
  const breaker = options?.circuitBreaker ?? defaultVectorCircuitBreaker;
  const circuitBreakerOpen = options?.isCircuitBreakerOpen
    ? options.isCircuitBreakerOpen()
    : breaker.isOpen();

  const semanticDecision = evaluateSemanticGating({
    semanticRequested: query.semantic,
    intentType: intent.type,
    structuredCandidateCount: structuredResult.totalMatches,
    limit: query.limit,
    circuitBreakerOpen,
  });

  let degraded = false;
  let degradationReason: string | undefined = undefined;

  if (circuitBreakerOpen && query.semantic) {
    degraded = true;
    degradationReason = 'CIRCUIT_BREAKER_OPEN: semantic vector search degraded';
  }

  if (semanticDecision.enabled && options?.queryVector && options.queryVector.length > 0) {
    try {
      const semanticResult = await executeSemanticArm(db, options.queryVector, {
        filterPlan: structuredResult.plan,
        limit: query.limit * 3,
      });
      breaker.recordSuccess();
      if (semanticResult.candidates.length > 0) {
        strategy = 'SEMANTIC_HYBRID';
        for (const c of semanticResult.candidates) {
          const existing = candidatesMap.get(c.productId);
          if (existing) {
            candidatesMap.set(c.productId, { ...existing, semanticSimilarity: c.semanticSimilarity });
          } else {
            candidatesMap.set(c.productId, c);
          }
        }
      }
    } catch (err) {
      breaker.recordFailure();
      degraded = true;
      degradationReason = `Vector arm failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // 8. Business ranking
  const candidateSignals: CandidateRankingSignals[] = Array.from(candidatesMap.values()).map((c) => {
    const row = c.row;
    const effectiveTextRank = c.textRank > 0 ? c.textRank : c.trigramSimilarity;
    return {
      productId: c.productId,
      textRank: effectiveTextRank,
      semanticSimilarity: c.semanticSimilarity,
      businessSignal: 1.0,
      facetMatchBonus: 1.0,
      availability: Boolean(row['availability']),
      state: String(row['state'] ?? 'ACTIVE'),
      createdAtEpochMs: row['created_at'] ? new Date(String(row['created_at'])).getTime() : undefined,
      referenceTimeEpochMs: Date.now(),
      hasVerifiedCertificate: Boolean(row['has_verified_certificate']),
      stoneTypeRecorded: Boolean(row['has_stone_type']),
      isReadyMade: String(row['kind']) === 'READY_MADE',
      isTreated: Boolean(row['treatment_code'] && String(row['treatment_code']) !== 'NO_ENHANCEMENT'),
      isPair: String(row['kind']) === 'PAIR',
    };
  });

  const rankedScores = rankCandidates(candidateSignals);

  // Re-order rows based on ranking
  const rankedRows: Array<Record<string, unknown>> = [];
  for (const score of rankedScores) {
    const candidate = candidatesMap.get(score.productId);
    if (candidate) {
      rankedRows.push(candidate.row);
    }
  }

  // Slice for limit
  const pagedRows = rankedRows.slice(0, query.limit);
  const items = mapProductSummaries(pagedRows);

  // 9. Facets
  const facets = await computeSearchFacets(
    db,
    structuredResult.plan,
    mergedFilters,
    textQueryToRun.length > 0 ? textQueryToRun : undefined,
  );

  return {
    items,
    facets,
    rejected_filters: structuredResult.rejectedFilters as any,
    meta: {
      limit: query.limit,
      has_more: rankedRows.length > query.limit,
      next_cursor: null,
      search_version: 'search-v1',
      strategy,
      intent: intent.type,
      degraded,
      degradation_reason: degradationReason,
      candidate_count: rankedRows.length,
    },
  };
}

export async function executeSuggest(
  db: CatalogDatabase,
  rawQuery: SearchSuggestQuery,
): Promise<SearchSuggestResult> {
  const query = SearchSuggestQuerySchema.parse(rawQuery);
  const prefix = query.prefix.trim().toLowerCase();

  const suggestions: Array<{
    text: string;
    kind: 'VARIETY' | 'COLOUR' | 'JEWELLERY_TYPE' | 'PRODUCT' | 'IDENTIFIER';
    url: string;
    score: number;
  }> = [];

  // 1. Suggest variety matches
  const varietyStatement = sql`
    SELECT slug, name
    FROM gemstone_varieties
    WHERE deleted_at IS NULL
      AND (name ILIKE ${prefix + '%'} OR similarity(name, ${prefix}) >= 0.3)
    ORDER BY similarity(name, ${prefix}) DESC
    LIMIT 3
  `;

  // 2. Suggest colour matches
  const colourStatement = sql`
    SELECT slug, name
    FROM gemstone_colours
    WHERE deleted_at IS NULL
      AND name ILIKE ${prefix + '%'}
    LIMIT 3
  `;

  // 3. Suggest jewellery types
  const jewelleryStatement = sql`
    SELECT code::text AS code, label
    FROM jewellery_types
    WHERE label ILIKE ${prefix + '%'}
    LIMIT 2
  `;

  const [varRes, colRes, jewRes] = await Promise.all([
    db.execute(varietyStatement),
    db.execute(colourStatement),
    db.execute(jewelleryStatement),
  ]);

  for (const row of (varRes.rows ?? []) as Array<Record<string, unknown>>) {
    suggestions.push({
      text: String(row['name']),
      kind: 'VARIETY',
      url: `/varieties/${row['slug']}`,
      score: 1.0,
    });
  }

  for (const row of (colRes.rows ?? []) as Array<Record<string, unknown>>) {
    suggestions.push({
      text: String(row['name']),
      kind: 'COLOUR',
      url: `/colors/${row['slug']}`,
      score: 0.9,
    });
  }

  for (const row of (jewRes.rows ?? []) as Array<Record<string, unknown>>) {
    suggestions.push({
      text: String(row['label']),
      kind: 'JEWELLERY_TYPE',
      url: `/category/${String(row['code']).toLowerCase()}`,
      score: 0.8,
    });
  }

  return {
    prefix: query.prefix,
    suggestions: suggestions.slice(0, query.limit),
  };
}

export async function executeSimilarGemstones(
  db: CatalogDatabase,
  gemRef: string,
  limit: number = 6,
): Promise<SimilarGemstonesResult> {
  const query = SimilarGemstonesQuerySchema.parse({ gemRef, limit });

  // 1. Fetch source gemstone details
  const stoneStatement = sql`
    SELECT g.id, g.variety_id, g.colour_id, g.total_weight_ct::float8 AS total_weight_ct
    FROM gemstones g
    WHERE g.gem_ref = ${query.gemRef}
      AND g.deleted_at IS NULL
    LIMIT 1
  `;

  const stoneRes = await db.execute(stoneStatement);
  const stone = stoneRes.rows?.[0] as Record<string, unknown> | undefined;

  if (!stone) {
    return {
      source_gem_ref: query.gemRef,
      items: [],
    };
  }

  const weight = Number(stone['total_weight_ct'] ?? 1.0);
  const minWeight = Math.max(0, weight * 0.7);
  const maxWeight = weight * 1.3;

  // 2. Find similar products with same variety, similar weight
  const similarStatement = sql`
    SELECT
      ${PRODUCT_SEARCH_COLUMNS}
    FROM products p
    ${PRODUCT_SEARCH_JOINS}
    WHERE p.deleted_at IS NULL
      AND p.state = 'ACTIVE'
      AND p.variety_id = ${stone['variety_id']}::uuid
      AND p.total_weight_ct BETWEEN ${minWeight} AND ${maxWeight}
      AND (p.gemstone_id IS NULL OR p.gemstone_id != ${stone['id']}::uuid)
    ORDER BY abs(p.total_weight_ct - ${weight}) ASC, p.id DESC
    LIMIT ${query.limit}
  `;

  const similarRes = await db.execute(similarStatement);
  const rows = (similarRes.rows ?? []) as Array<Record<string, unknown>>;
  const items = mapProductSummaries(rows);

  return {
    source_gem_ref: query.gemRef,
    items,
  };
}
