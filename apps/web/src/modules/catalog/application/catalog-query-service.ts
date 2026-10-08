/**
 * apps/web/src/modules/catalog/application/catalog-query-service.ts
 *
 * Tasks 6 + 7 — the catalogue query service: CatalogQueryPort wrapped with
 * cache-aside reads, tag + generation invalidation, and Redis degradation.
 *
 * Layering (technical_design/06 route-handler contract, doc 07 layering):
 *
 *   route handler  ->  THIS service  ->  CatalogQueryPort (packages/db) -> Postgres
 *                        ^
 *                        +-- cache store + generation store (Redis in prod)
 *
 * The cache sits ABOVE the port, never inside it: repositories stay free of
 * cache concerns and the port remains the single catalogue read surface
 * (Phase 3 task 2 preserved).
 *
 * Correctness rules enforced here:
 *   - Postgres is the source of truth (ADR-002). A cache entry is only ever
 *     a copy of something the port already returned.
 *   - Cache failure NEVER fails a request: generation lookup, GET, SET, index
 *     writes and decoding all degrade to a direct port call (Task 7).
 *   - Database/application errors are NEVER swallowed: `exec()` runs outside
 *     every catch block, so only cache failures degrade.
 *   - A degraded read returns FRESH database data, never a stale entry.
 *   - Every response carries deterministic tags (surrogate keys of Task 10)
 *     and its cache outcome, so the HTTP layer can emit headers without
 *     knowing anything about keys or Redis.
 */
import {
  ProductListQuerySchema,
  SettingListQuerySchema,
  ProductListResultSchema,
  SettingListResultSchema,
  ProductDetailSchema,
  GemstoneDetailSchema,
  SettingDetailSchema,
  TaxonomyListSchema,
  type CatalogQueryPort,
  type ProductListQuery,
  type ProductListResult,
  type ProductDetailReadModel,
  type GemstoneDetailReadModel,
  type SettingListQuery,
  type SettingListResult,
  type SettingDesignReadModel,
  SettingVariantEnvelopeSchema,
  type SettingVariantEnvelope,
  type TaxonomyReadModel,
} from '@maihan/contracts';
import {
  actorToken,
  buildCacheKey,
  buildCacheTags,
  identifierIdentity,
  queryIdentity,
  type CacheScope,
  type Generation,
  type ResponseVisibility,
} from './cache-identity.js';
import { decodeCacheValue, encodeCacheValue, type CacheSchema } from './cache-codec.js';
import type { GenerationStore } from './generation-store.js';
import { defaultSurfaces, type CatalogSurfaceName, type SurfaceMap } from './cache-policy.js';
import type { CacheStore } from '../infrastructure/cache-store.js';

/** Why a call did not hit the cache (machine-readable, logged not thrown). */
export type CacheReason =
  | 'hit'
  | 'miss'
  | 'generation-unavailable'
  | 'store-unavailable'
  | 'malformed-entry'
  | 'store-write-failed';

/** Everything the HTTP layer needs to emit Task 10 headers. */
export interface CacheInfo {
  /** The exact key this response was read from / written to; null when bypassed. */
  key: string | null;
  /** Deterministic tags: invalidation units AND surrogate keys (Task 10). */
  tags: string[];
  /** Generation folded into the key, null when the generation was unavailable. */
  generation: Generation | null;
  /** Response visibility from the surface policy (never guessed). */
  visibility: ResponseVisibility;
  /** True only when the value came from the cache. */
  hit: boolean;
  /** True when the cache could not be used (Redis failure etc.). */
  degraded: boolean;
  reason: CacheReason;
}

export interface Cached<T> {
  value: T;
  cache: CacheInfo;
}

export interface CatalogCallOptions {
  /** Actor key for authorization-sensitive surfaces; ignored for public ones. */
  actorKey?: string | null;
}

export interface CatalogQueryServiceDeps {
  port: CatalogQueryPort;
  store: CacheStore;
  generations: GenerationStore;
  /** Environment namespace (cacheNamespace(environment)). */
  namespace: string;
  /** Surface policy map; defaults to the documented Phase 3 table. */
  surfaces?: SurfaceMap;
}

export interface CatalogQueryService {
  listProducts(query: ProductListQuery, options?: CatalogCallOptions): Promise<Cached<ProductListResult>>;
  getProductBySlug(slug: string, options?: CatalogCallOptions): Promise<Cached<ProductDetailReadModel>>;
  getGemstoneByGemRef(gemRef: string, options?: CatalogCallOptions): Promise<Cached<GemstoneDetailReadModel>>;
  listSettings(query: SettingListQuery, options?: CatalogCallOptions): Promise<Cached<SettingListResult>>;
  getSettingByDesignCode(designCode: string, options?: CatalogCallOptions): Promise<Cached<SettingDesignReadModel>>;
  getSettingVariantBySku(
    sku: string,
    options?: CatalogCallOptions,
  ): Promise<Cached<SettingVariantEnvelope>>;
  getTaxonomy(options?: CatalogCallOptions): Promise<Cached<TaxonomyReadModel>>;

  /** Delete every entry indexed under a tag (SoT 15.3). Returns the count. */
  invalidateTag(tag: string): Promise<number>;
  /** Bump a scope's generation, retiring every key in that scope (SoT 15.3). */
  bumpGeneration(scope: CacheScope): Promise<Generation>;
}

const BYPASS_TAGS_SUFFIX = 'unavailable';

export function createCatalogQueryService(deps: CatalogQueryServiceDeps): CatalogQueryService {
  const surfaces = deps.surfaces ?? defaultSurfaces();

  /**
   * One cache-aside read. Order of operations is the Task 6/7 contract:
   * generation -> key/tags -> GET -> validate -> (miss|hit) -> exec -> SET.
   * Every cache step is individually failure-isolated; `exec` is not.
   */
  async function cachedRead<T>(
    surface: CatalogSurfaceName,
    identity: string,
    schema: CacheSchema<T>,
    exec: () => Promise<T>,
    options?: CatalogCallOptions,
  ): Promise<Cached<T>> {
    const policy = surfaces[surface];
    const actor = actorToken(options?.actorKey ?? null, policy.visibility);
    const tagsWithoutGeneration = buildCacheTags({
      scope: policy.scope,
      kind: policy.kind,
      identity: policy.kind === 'list' || policy.kind === 'all' ? null : identity,
      generation: BYPASS_TAGS_SUFFIX,
      visibility: policy.visibility,
    });

    // 1. Generation lookup. Unavailable => bypass entirely: building a key
    //    without the current generation could resurrect a stale entry.
    let generation: Generation;
    try {
      generation = await deps.generations.get(policy.scope);
    } catch {
      return {
        value: await exec(),
        cache: bypass(policy.visibility, tagsWithoutGeneration, 'generation-unavailable'),
      };
    }

    const key = buildCacheKey({
      namespace: deps.namespace,
      scope: policy.scope,
      kind: policy.kind,
      identity,
      generation,
      actor,
    });
    const tags = buildCacheTags({
      scope: policy.scope,
      kind: policy.kind,
      identity: policy.kind === 'list' || policy.kind === 'all' ? null : identity,
      generation,
      visibility: policy.visibility,
    });

    // 2. GET. Failure => bypass to Postgres (never a stale serve).
    let raw: string | null;
    try {
      raw = await deps.store.get(key);
    } catch {
      return {
        value: await exec(),
        cache: bypass(policy.visibility, tags, 'store-unavailable'),
      };
    }

    if (raw !== null) {
      const decoded = decodeCacheValue(raw, schema);
      if (decoded !== null) {
        return {
          value: decoded,
          cache: {
            key,
            tags,
            generation,
            visibility: policy.visibility,
            hit: true,
            degraded: false,
            reason: 'hit',
          },
        };
      }
      // Malformed/foreign payload => treated as a miss (Task 7), never served.
    }

    // 3. Source of truth. Errors propagate — a database failure is NOT a
    //    cache degradation and must surface as itself.
    const value = await exec();

    // 4. Populate + tag index. Failure degrades the metadata only; the
    //    caller already has correct data.
    try {
      const encoded = encodeCacheValue(value);
      await deps.store.set(key, encoded, policy.ttlSeconds);
      await deps.store.addToIndex(tags, key, policy.ttlSeconds);
      return {
        value,
        cache: {
          key,
          tags,
          generation,
          visibility: policy.visibility,
          hit: false,
          degraded: false,
          reason: raw === null ? 'miss' : 'malformed-entry',
        },
      };
    } catch {
      return {
        value,
        cache: {
          key,
          tags,
          generation,
          visibility: policy.visibility,
          hit: false,
          degraded: true,
          reason: 'store-write-failed',
        },
      };
    }
  }

  return {
    listProducts(query, options) {
      const parsed = ProductListQuerySchema.parse(query);
      return cachedRead(
        'productsList',
        queryIdentity('/api/v1/products', parsed),
        ProductListResultSchema,
        () => deps.port.listProducts(query),
        options,
      );
    },

    getProductBySlug(slug, options) {
      return cachedRead(
        'productDetail',
        identifierIdentity(slug),
        ProductDetailSchema,
        () => deps.port.getProductBySlug(slug),
        options,
      );
    },

    getGemstoneByGemRef(gemRef, options) {
      return cachedRead(
        'gemstoneDetail',
        identifierIdentity(gemRef),
        GemstoneDetailSchema,
        () => deps.port.getGemstoneByGemRef(gemRef),
        options,
      );
    },

    listSettings(query, options) {
      const parsed = SettingListQuerySchema.parse(query);
      return cachedRead(
        'settingsList',
        queryIdentity('/api/v1/settings', parsed),
        SettingListResultSchema,
        () => deps.port.listSettings(query),
        options,
      );
    },

    getSettingByDesignCode(designCode, options) {
      return cachedRead(
        'settingDesign',
        identifierIdentity(designCode),
        SettingDetailSchema,
        () => deps.port.getSettingByDesignCode(designCode),
        options,
      );
    },

    getSettingVariantBySku(sku, options) {
      return cachedRead(
        'settingVariant',
        identifierIdentity(sku),
        SettingVariantEnvelopeSchema,
        () => deps.port.getSettingVariantBySku(sku),
        options,
      );
    },


    getTaxonomy(options) {
      return cachedRead(
        'taxonomy',
        identifierIdentity('all'),
        TaxonomyListSchema,
        () => deps.port.getTaxonomy(),
        options,
      );
    },

    async invalidateTag(tag) {
      const keys = await deps.store.members(tag);
      if (keys.length === 0) return 0;
      await deps.store.del([...keys, tag]);
      return keys.length;
    },

    bumpGeneration(scope) {
      return deps.generations.bump(scope);
    },
  };
}

function bypass(
  visibility: ResponseVisibility,
  tags: string[],
  reason: CacheReason,
): CacheInfo {
  return {
    key: null,
    tags,
    generation: null,
    visibility,
    hit: false,
    degraded: true,
    reason,
  };
}
