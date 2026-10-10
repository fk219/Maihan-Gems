/**
 * apps/web/src/api/search-handlers.ts
 *
 * Route handlers for Phase 5 search surfaces:
 *   - POST /search & POST /api/v1/search
 *   - GET /search/suggest & GET /api/v1/search/suggest
 *   - GET /search/similar-gemstones/{gemRef} & GET /api/v1/search/similar-gemstones/{gemRef}
 *
 * Scope authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 5 outputs
 *   - technical_design/06_API_ARCHITECTURE.md §89-92
 *   - technical_design/12_SEARCH_ARCHITECTURE.md
 */
import {
  ContractError,
  SearchQuerySchema,
  SearchSuggestQuerySchema,
} from '@maihan/contracts';
import type { RouteHandler } from './handlers.js';
import { requireIdentifier } from './query.js';

export const SEARCH_HANDLERS: Record<string, RouteHandler> = {
  async search(ctx) {
    let rawBody: unknown = {};
    if (ctx.request) {
      try {
        const text = await ctx.request.text();
        if (text.trim().length > 0) {
          rawBody = JSON.parse(text);
        }
      } catch {
        throw new ContractError('VALIDATION_FAILED', 'Malformed JSON in search request body.');
      }
    }

    const query = SearchQuerySchema.parse(rawBody);
    const result = await ctx.service.search(query);
    return {
      status: 200,
      body: {
        data: result.value.items,
        facets: result.value.facets,
        rejectedFilters: result.value.rejected_filters,
        meta: result.value.meta,
      },
      cache: result.cache,
    };
  },

  async searchSuggest(ctx) {
    const prefix = ctx.url.searchParams.get('q') ?? ctx.url.searchParams.get('prefix') ?? '';
    const limitParam = ctx.url.searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : 5;

    const query = SearchSuggestQuerySchema.parse({ prefix, limit });
    const result = await ctx.service.suggest(query);
    return {
      status: 200,
      body: {
        data: result.value.suggestions,
        prefix: result.value.prefix,
      },
      cache: result.cache,
    };
  },

  async similarGemstones(ctx) {
    const gemRef = requireIdentifier(ctx.params['gemRef'], 'gemRef');
    const limitParam = ctx.url.searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : 6;

    const result = await ctx.service.similarGemstones(gemRef, limit);
    return {
      status: 200,
      body: {
        data: result.value.items,
        sourceGemRef: result.value.source_gem_ref,
      },
      cache: result.cache,
    };
  },
};
