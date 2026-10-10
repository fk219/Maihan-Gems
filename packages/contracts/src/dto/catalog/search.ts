/**
 * packages/contracts/src/dto/catalog/search.ts
 *
 * Search contracts for Phase 5 (Hybrid Search + Filters).
 *
 * Scope authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 5
 *   - PROJECT_SOURCE_OF_TRUTH.md §11.3 & §14
 *   - technical_design/12_SEARCH_ARCHITECTURE.md
 */
import { z } from 'zod';
import {
  SORT_DIRECTION_SCHEMA,
  PageMetaSchema,
  RejectedFilterSchema,
} from './filters.js';
import { FacetSetSchema } from './facets.js';
import { ProductFilterShapeSchema } from './queries.js';
import {
  PRODUCT_CURSOR_DEFAULT_LIMIT,
  PRODUCT_CURSOR_MAX_LIMIT,
} from './cursor.js';
import { ProductSummarySchema } from './entities.js';

export const SEARCH_SORT_KEYS = ['relevance', 'price', 'weight', 'recency'] as const;
export type SearchSortKey = (typeof SEARCH_SORT_KEYS)[number];
export const SEARCH_SORT_KEY_SCHEMA = z.enum(SEARCH_SORT_KEYS);

/** Search strategy executed for observability and degradation tracking. */
export const SEARCH_STRATEGY_SCHEMA = z.enum([
  'STRUCTURED_ONLY',
  'FULLTEXT_HYBRID',
  'TRIGRAM_FALLBACK',
  'SEMANTIC_HYBRID',
  'EXACT_IDENTIFIER',
]);
export type SearchStrategy = z.infer<typeof SEARCH_STRATEGY_SCHEMA>;

/** Search intent classification output. */
export const SEARCH_INTENT_SCHEMA = z.enum([
  'IDENTIFIER_LOOKUP',
  'NAVIGATIONAL',
  'DESCRIPTIVE',
  'PRODUCT_SEARCH',
]);
export type SearchIntent = z.infer<typeof SEARCH_INTENT_SCHEMA>;

/** The search port input: query text + structured filters + pagination. */
export const SearchQuerySchema = z.object({
  query: z.string().max(300).default(''),
  filters: ProductFilterShapeSchema.default({}),
  semantic: z.boolean().default(true),
  limit: z
    .number()
    .int()
    .min(1)
    .max(PRODUCT_CURSOR_MAX_LIMIT)
    .default(PRODUCT_CURSOR_DEFAULT_LIMIT),
  cursor: z.string().optional(),
  sort: SEARCH_SORT_KEY_SCHEMA.default('relevance'),
  direction: SORT_DIRECTION_SCHEMA.default('asc'),
});

export type SearchQuery = z.input<typeof SearchQuerySchema>;
export type ResolvedSearchQuery = z.output<typeof SearchQuerySchema>;

/** Metadata accompanying search responses. */
export const SearchMetaSchema = PageMetaSchema.extend({
  search_version: z.string().default('search-v1'),
  strategy: SEARCH_STRATEGY_SCHEMA,
  intent: SEARCH_INTENT_SCHEMA,
  degraded: z.boolean().default(false),
  degradation_reason: z.string().optional(),
  candidate_count: z.number().int().min(0),
});

export type SearchMeta = z.infer<typeof SearchMetaSchema>;

/** The search result envelope. */
export const SearchResultSchema = z.object({
  items: z.array(ProductSummarySchema),
  facets: FacetSetSchema,
  rejected_filters: z.array(RejectedFilterSchema),
  meta: SearchMetaSchema,
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

/** Suggest / Autocomplete contracts. */
export const SearchSuggestQuerySchema = z.object({
  prefix: z.string().min(1).max(100),
  limit: z.number().int().min(1).max(20).default(5),
});

export type SearchSuggestQuery = z.input<typeof SearchSuggestQuerySchema>;
export type ResolvedSearchSuggestQuery = z.output<typeof SearchSuggestQuerySchema>;

export const SuggestItemSchema = z.object({
  text: z.string(),
  kind: z.enum(['VARIETY', 'COLOUR', 'JEWELLERY_TYPE', 'PRODUCT', 'IDENTIFIER']),
  url: z.string(),
  score: z.number().min(0),
});

export type SuggestItem = z.infer<typeof SuggestItemSchema>;

export const SearchSuggestResultSchema = z.object({
  prefix: z.string(),
  suggestions: z.array(SuggestItemSchema),
});

export type SearchSuggestResult = z.infer<typeof SearchSuggestResultSchema>;

/** Similar gemstones contracts. */
export const SimilarGemstonesQuerySchema = z.object({
  gemRef: z.string().min(1).max(50),
  limit: z.number().int().min(1).max(20).default(6),
});

export type SimilarGemstonesQuery = z.input<typeof SimilarGemstonesQuerySchema>;
export type ResolvedSimilarGemstonesQuery = z.output<typeof SimilarGemstonesQuerySchema>;

export const SimilarGemstonesResultSchema = z.object({
  source_gem_ref: z.string(),
  items: z.array(ProductSummarySchema),
});

export type SimilarGemstonesResult = z.infer<typeof SimilarGemstonesResultSchema>;
