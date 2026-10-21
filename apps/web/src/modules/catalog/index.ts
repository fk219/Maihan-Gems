/**
 * apps/web/src/modules/catalog — the catalogue module's ONLY public surface
 * (technical_design/03: `index.ts` is the enforced public surface; a deep
 * import into this module is a lint error).
 *
 * Phase 3 surface:
 *   - `createCatalogQueryService` — CatalogQueryPort wrapped with cache-aside
 *     reads, deterministic cache keys/tags (task 6), generation-bump
 *     invalidation (task 6) and Redis degradation (task 7).
 *   - the pure cache-identity primitives (keys, tags, surrogate keys), so the
 *     HTTP layer derives Task 10 headers from the SAME derivation the
 *     invalidation layer uses — they cannot drift apart.
 *   - the store/generation contracts plus the in-memory and null
 *     implementations (tests and no-Redis local runs).
 *
 * The SQL-backed `CatalogQueryPort` itself stays in packages/db and is
 * injected here; this module never imports a database driver.
 */
export {
  createCatalogQueryService,
  type Cached,
  type CacheInfo,
  type CacheReason,
  type CatalogCallOptions,
  type CatalogQueryService,
  type CatalogQueryServiceDeps,
} from './application/catalog-query-service.js';

export {
  CACHE_SCHEMA_VERSION,
  CACHE_SCOPES,
  actorToken,
  buildCacheKey,
  buildCacheTags,
  cacheNamespace,
  canonicalJson,
  identifierIdentity,
  queryIdentity,
  sha256Hex,
  surrogateKeys,
  type CacheKeyInput,
  type CacheScope,
  type Generation,
  type ResponseVisibility,
} from './application/cache-identity.js';

export { buildFacetDefinitions } from './application/facet-definitions.js';

export {
  CATALOG_SURFACES,
  defaultSurfaces,
  type CatalogSurfaceName,
  type SurfaceMap,
  type SurfacePolicy,
} from './application/cache-policy.js';

export type { GenerationStore } from './application/generation-store.js';

export {
  decodeCacheValue,
  encodeCacheValue,
  type CacheSchema,
} from './application/cache-codec.js';

export {
  MemoryCacheStore,
  MemoryGenerationStore,
  NullCacheStore,
  type CacheStore,
} from './infrastructure/cache-store.js';

export { RedisCacheStore, RedisGenerationStore } from './infrastructure/redis-store.js';

export {
  createFeatureFlagGenerationStore,
  type FeatureFlagGenerationStoreOptions,
} from './infrastructure/feature-flag-generation-store.js';
