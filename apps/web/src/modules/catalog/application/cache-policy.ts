/**
 * apps/web/src/modules/catalog/application/cache-policy.ts
 *
 * Task 6/10 — the per-surface cache policy: scope, key kind, TTL and
 * visibility.
 *
 * Authority for TTL and visibility is the documented route table
 * (PROJECT_SOURCE_OF_TRUTH.md 11.2 and technical_design/06 "Catalog reads"),
 * which states each catalogue route's cache duration and marks every one of
 * them `public`:
 *
 *   GET /products                60s SWR   (SoT 15.1 #2 variant list: 60s)
 *   GET /products/{slug}         300s SWR  (SoT 15.1 #1 product detail: 300s)
 *   GET /gemstones/{gemRef}      300s SWR  (SoT 15.1 #3 gemstone detail: 300s)
 *   GET /settings                300s SWR
 *   GET /settings/{sku}          300s SWR
 *   GET /settings/designs/{code} 300s SWR  (same detail family)
 *   GET /taxonomy/*              1h        (SoT 15.1 #4/#5 taxonomy: 3600s)
 *
 * Visibility is determined PER ENDPOINT from the route table, never assumed:
 * every Phase 3 catalogue read is documented `public`, so `public` is a
 * verified property of these routes, not a blanket default. A future
 * authorization-sensitive surface declares `private` here and everything
 * downstream follows (cache key varies by actor, Cache-Control private,
 * Vary: Authorization, no surrogate keys).
 */
import type { CacheScope, ResponseVisibility } from './cache-identity.js';

export interface SurfacePolicy {
  /** Resource scope; owns the generation counter used in every key. */
  readonly scope: CacheScope;
  /** Key pattern kind inside the scope. */
  readonly kind: string;
  /** TTL in seconds — the documented route cache duration (SoT 11.2). */
  readonly ttlSeconds: number;
  /** Whether the response may be shared between callers (doc 06 route table). */
  readonly visibility: ResponseVisibility;
}

export const CATALOG_SURFACES = {
  productsList: { scope: 'products', kind: 'list', ttlSeconds: 60, visibility: 'public' },
  productDetail: { scope: 'products', kind: 'product', ttlSeconds: 300, visibility: 'public' },
  gemstoneDetail: { scope: 'gemstones', kind: 'gemstone', ttlSeconds: 300, visibility: 'public' },
  settingsList: { scope: 'settings', kind: 'list', ttlSeconds: 300, visibility: 'public' },
  settingDesign: { scope: 'settings', kind: 'design', ttlSeconds: 300, visibility: 'public' },
  settingVariant: { scope: 'settings', kind: 'variant', ttlSeconds: 300, visibility: 'public' },
  taxonomy: { scope: 'taxonomy', kind: 'all', ttlSeconds: 3600, visibility: 'public' },
  search: { scope: 'search', kind: 'query', ttlSeconds: 60, visibility: 'public' },
  searchFacets: { scope: 'search', kind: 'facets', ttlSeconds: 300, visibility: 'public' },
  searchSuggest: { scope: 'search', kind: 'suggest', ttlSeconds: 3600, visibility: 'public' },
  similarGemstones: { scope: 'search', kind: 'similar', ttlSeconds: 300, visibility: 'public' },
} as const satisfies Record<string, SurfacePolicy>;

export type CatalogSurfaceName = keyof typeof CATALOG_SURFACES;

export type SurfaceMap = Record<CatalogSurfaceName, SurfacePolicy>;

export function defaultSurfaces(): SurfaceMap {
  return { ...CATALOG_SURFACES };
}
