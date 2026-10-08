/**
 * apps/web/src/api/headers.ts
 *
 * Task 10 — response caching headers + surrogate keys, DERIVED FROM THE
 * CACHE-TAG STRATEGY (plan task 10). Nothing here invents a tag: the
 * surrogate keys are the same `cacheInfo.tags` the invalidation layer
 * (Task 6, generation-bump + tag purge) computes, joined by the same
 * `surrogateKeys()` primitive — purge-by-tag and serve-with-keys cannot
 * drift apart because they share one derivation.
 *
 * Values:
 *   - `Cache-Control`: the documented per-route TTL from the route cache
 *     table (SoT 11.2 / technical_design/06 "Catalog reads": /products 60s,
 *     detail routes 300s, taxonomy 1h — all `public`), with
 *     `stale-while-revalidate` at the same horizon so an edge can serve a
 *     stale copy while a refresh happens (the "SWR" of the route table).
 *   - `Surrogate-Key`: space-separated tags, PUBLIC responses only.
 *     A private response is not storable by a shared cache, so it carries
 *     no surrogate keys (technical_design/25 §surrogate keys).
 *   - `Vary: Authorization` + `Cache-Control: private, no-store` for a
 *     private surface — no Phase 3 route is private; the branch exists so a
 *     future authorization-sensitive surface is safe by construction, not
 *     by remembering to edit this file.
 *
 * What is NEVER emitted: the internal cache key (CacheInfo.key). It carries
 * the environment namespace, schema version and generation counter —
 * internal mechanics, not a public contract (technical_design/25 §9: no
 * internals in headers/logs).
 */
import { CATALOG_SURFACES, surrogateKeys, type CacheInfo, type CatalogSurfaceName } from '../modules/catalog/index.js';

/**
 * Build the cache-related response headers for one catalogue response.
 *
 * @param cache   the CacheInfo the service returned with the read model.
 * @param surface the route's cache surface (scope/TTL/visibility, SoT 11.2).
 */
export function applyCacheHeaders(cache: CacheInfo, surface: CatalogSurfaceName): Record<string, string> {
  const policy = CATALOG_SURFACES[surface];

  if (cache.visibility === 'public') {
    const headers: Record<string, string> = {
      'Cache-Control': `public, max-age=${policy.ttlSeconds}, stale-while-revalidate=${policy.ttlSeconds}`,
    };
    const keys = surrogateKeys(cache.tags, 'public');
    if (keys !== null && keys !== '') headers['Surrogate-Key'] = keys;
    return headers;
  }

  // Private: never shared, never tagged for a surrogate cache.
  return {
    'Cache-Control': 'private, no-store',
    'Vary': 'Authorization',
  };
}
