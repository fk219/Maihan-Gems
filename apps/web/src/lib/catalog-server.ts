/**
 * apps/web/src/lib/catalog-server.ts
 *
 * The storefront's server data seam (Task 3).
 *
 * Server Components import their queries from HERE and nowhere else. The
 * module composes the SAME Phase 3 pieces the API composition root
 * (api/server.ts) wires — CatalogQueryPort (@maihan/db) behind the cached
 * CatalogQueryService (modules/catalog) — so the storefront has NO second
 * data-access layer and NO direct database path:
 *
 *   page (Server Component) -> catalog-server -> CatalogQueryService
 *     -> CatalogQueryPort (@maihan/contracts interface, @maihan/db SQL)
 *
 * Rules honoured:
 *   - `import 'server-only'`: this module must never end up in a client
 *     bundle (the DATABASE_URL must never reach the browser).
 *   - The service is a module-level singleton: Server Component renders share
 *     one pool and one cache-aside service (same as the API process).
 *   - Cache tags stay the Phase 3 derivation (buildCacheTags via the service);
 *     the storefront adds NO new cache mechanism.
 *
 * Failure translation: identity lookups throw the closed-registry
 * ContractError (PRODUCT_NOT_FOUND etc.) exactly as the API layer sees them;
 * pages turn PRODUCT_NOT_FOUND into Next's notFound() and leave everything
 * else to the route error boundary.
 */
import 'server-only';
import { loadRuntimeConfig } from '@maihan/config';
import { createCatalogDatabase, createCatalogQueryPort, createPool } from '@maihan/db';
import {
  MemoryGenerationStore,
  NullCacheStore,
  cacheNamespace,
  createCatalogQueryService,
  type CatalogQueryService,
} from '../modules/catalog/index.js';

const globalStore = globalThis as unknown as {
  __maihanCatalogService?: CatalogQueryService;
  /** Test seam: when set, getService returns this instead of composing. */
  __maihanCatalogServiceOverride?: CatalogQueryService;
};

function getService(): CatalogQueryService {
  const override = globalStore.__maihanCatalogServiceOverride;
  if (override !== undefined) return override;

  const existing = globalStore.__maihanCatalogService;
  if (existing !== undefined) return existing;

  const config = loadRuntimeConfig();
  const pool = createPool(config.databaseUrl);
  const port = createCatalogQueryPort(createCatalogDatabase(pool));

  // Redis is OPTIONAL for the storefront (Task 7 degradation semantics):
  // without REDIS_URL the service runs its documented bypass — Postgres
  // remains truth on every read. Wiring the Redis store here is a
  // deployment-configuration step, not new architecture.
  const service = createCatalogQueryService({
    port,
    store: new NullCacheStore(),
    generations: new MemoryGenerationStore(),
    namespace: cacheNamespace(config.environment),
  });

  globalStore.__maihanCatalogService = service;
  return service;
}

/** Taxonomy-driven reads for Server Components (Task 3). */
export function catalogServer(): CatalogQueryService {
  return getService();
}

/**
 * Test-only override (imported exclusively by *.spec.ts): substitute a
 * service built over the FakeCatalogPort so page specs render without a
 * database. Production code never calls this.
 */
export function setCatalogServiceForTest(service: CatalogQueryService | undefined): void {
  if (service === undefined) delete globalStore.__maihanCatalogServiceOverride;
  else globalStore.__maihanCatalogServiceOverride = service;
}

/** Load one product detail, classifying not-found vs transient (Task 4). */
export async function loadProductDetail(
  slug: string,
): Promise<{ readonly ok: true; readonly value: Awaited<ReturnType<CatalogQueryService['getProductBySlug']>>['value'] } | { readonly ok: false; readonly error: unknown }> {
  try {
    const result = await getService().getProductBySlug(slug);
    return { ok: true, value: result.value };
  } catch (error) {
    return { ok: false, error };
  }
}
