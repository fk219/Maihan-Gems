/**
 * apps/web/src/api/handlers.ts
 *
 * Task 8 — the Phase 3 route handlers.
 *
 * Doc 06 "Route handler contract": a handler does exactly five things —
 * resolve input, validate (strict Zod), call EXACTLY ONE service, serialize,
 * and return. No SQL, no cache mechanics, no business branching: the cache
 * (Tasks 6/7), the rate limiter (Task 9) and the headers (Task 10) all live
 * outside this file, above or below it, never inside it.
 *
 * Every success body is the documented envelope from
 * `packages/contracts/dto/http/envelopes.ts` — the same schemas OpenAPI is
 * generated from. The port result's `rejected_filters` is renamed exactly
 * once, here, to the documented wire name `rejectedFilters`.
 */
import type { CacheInfo, CatalogQueryService } from '../modules/catalog/index.js';
import { buildFacetDefinitions } from '../modules/catalog/index.js';
import { parseProductListQuery, parseSettingListQuery, readRawQuery, requireIdentifier } from './query.js';
import type { CorrelationIds } from './envelope.js';

export interface RouteContext {
  readonly service: CatalogQueryService;
  readonly params: Record<string, string>;
  readonly url: URL;
  readonly ids: CorrelationIds;
  readonly request?: Request;
  readonly db?: import('@maihan/db').CatalogDatabase;
}

export interface HandlerOutcome {
  readonly status: number;
  readonly body: unknown;
  /** Present whenever a catalogue service call answered; drives Task 10 headers. */
  readonly cache?: CacheInfo;
}

export type RouteHandler = (ctx: RouteContext) => Promise<HandlerOutcome>;

const listEnvelope = <T extends { items: unknown; meta: unknown; facets: unknown; rejected_filters: unknown }>(
  value: T,
): Record<string, unknown> => ({
  data: value.items,
  meta: value.meta,
  facets: value.facets,
  rejectedFilters: value.rejected_filters,
});

const detailEnvelope = (data: unknown): Record<string, unknown> => ({ data });

export const HANDLERS: Record<string, RouteHandler> = {
  async listProducts(ctx) {
    const query = parseProductListQuery(readRawQuery(ctx.url));
    const result = await ctx.service.listProducts(query);
    return { status: 200, body: listEnvelope(result.value), cache: result.cache };
  },

  async productDetail(ctx) {
    const slug = requireIdentifier(ctx.params['slug'], 'slug');
    const result = await ctx.service.getProductBySlug(slug);
    return { status: 200, body: detailEnvelope(result.value), cache: result.cache };
  },

  async gemstoneDetail(ctx) {
    const gemRef = requireIdentifier(ctx.params['gemRef'], 'gemRef');
    const result = await ctx.service.getGemstoneByGemRef(gemRef);
    return { status: 200, body: detailEnvelope(result.value), cache: result.cache };
  },

  async listSettings(ctx) {
    const query = parseSettingListQuery(readRawQuery(ctx.url));
    const result = await ctx.service.listSettings(query);
    return { status: 200, body: listEnvelope(result.value), cache: result.cache };
  },

  async settingVariant(ctx) {
    const sku = requireIdentifier(ctx.params['sku'], 'sku');
    const result = await ctx.service.getSettingVariantBySku(sku);
    return { status: 200, body: detailEnvelope(result.value), cache: result.cache };
  },

  async settingDesign(ctx) {
    const designCode = requireIdentifier(ctx.params['designCode'], 'designCode');
    const result = await ctx.service.getSettingByDesignCode(designCode);
    return { status: 200, body: detailEnvelope(result.value), cache: result.cache };
  },

  // Taxonomy: ONE cached taxonomy read (SoT 15.1 #4, 1h), sliced per route.
  async taxonomyVarieties(ctx) {
    const result = await ctx.service.getTaxonomy();
    return { status: 200, body: detailEnvelope(result.value.varieties), cache: result.cache };
  },

  async taxonomyColours(ctx) {
    const result = await ctx.service.getTaxonomy();
    return { status: 200, body: detailEnvelope(result.value.colours), cache: result.cache };
  },

  async taxonomyOrigins(ctx) {
    const result = await ctx.service.getTaxonomy();
    return { status: 200, body: detailEnvelope(result.value.origins), cache: result.cache };
  },

  async taxonomyMetals(ctx) {
    const result = await ctx.service.getTaxonomy();
    return { status: 200, body: detailEnvelope(result.value.metals), cache: result.cache };
  },

  async taxonomyFacets(ctx) {
    const result = await ctx.service.getTaxonomy();
    return {
      status: 200,
      body: detailEnvelope(buildFacetDefinitions(result.value)),
      cache: result.cache,
    };
  },
};
