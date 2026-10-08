/**
 * Task 10 — response cache headers + surrogate keys.
 *
 * Three properties:
 *   1. VALUES: Cache-Control carries the documented route TTL with
 *      stale-while-revalidate (SoT 11.2 route table); Surrogate-Key carries
 *      the cache tags space-joined.
 *   2. DERIVATION: the emitted Surrogate-Key is EXACTLY the tag set the
 *      invalidation layer (Task 6) uses — proved end-to-end by purging a tag
 *      through the service and observing the next response rebuild, and by
 *      asserting the header equals the service's own cache.tags.
 *   3. ISOLATION: a private response carries no surrogate keys and no shared
 *      caching; the internal cache key NEVER appears in any header.
 */
import { describe, expect, it } from 'vitest';
import { applyCacheHeaders } from './headers.js';
import { createCatalogApi, type CatalogApi } from './index.js';
import {
  CATALOG_SURFACES,
  MemoryCacheStore,
  MemoryGenerationStore,
  createCatalogQueryService,
  type CacheInfo,
  type CatalogQueryService,
} from '../modules/catalog/index.js';
import { FakeCatalogPort, FailingCacheStore } from '../modules/catalog/testing/doubles.js';

const IDS = { traceId: '00000000000000000000000000000cc3', requestId: 'req_test_000000000003' };

const baseInfo = (overrides: Partial<CacheInfo> = {}): CacheInfo => ({
  key: 'mh-test:v1:products:product: pave-green-tourmaline-ring:g=0:pub',
  tags: [
    'catalog.scope.products',
    'catalog.products.product.pave-green-tourmaline-ring',
    'catalog.generation.products=0',
  ],
  generation: '0',
  visibility: 'public',
  hit: false,
  degraded: false,
  reason: 'miss',
  ...overrides,
});

// ─── Unit: header derivation ─────────────────────────────────────────────────

describe('applyCacheHeaders (unit)', () => {
  it('public detail route -> public max-age + SWR from the route table (300s)', () => {
    const headers = applyCacheHeaders(baseInfo(), 'productDetail');
    expect(headers['Cache-Control']).toBe('public, max-age=300, stale-while-revalidate=300');
    expect(CATALOG_SURFACES.productDetail.ttlSeconds).toBe(300);
  });

  it('products list uses the 60s variant-list TTL; taxonomy uses 1h (SoT 11.2)', () => {
    expect(applyCacheHeaders(baseInfo(), 'productsList')['Cache-Control']).toContain('max-age=60');
    expect(applyCacheHeaders(baseInfo(), 'taxonomy')['Cache-Control']).toContain('max-age=3600');
  });

  it('Surrogate-Key is the space-joined tag set (the invalidation units)', () => {
    const info = baseInfo();
    const headers = applyCacheHeaders(info, 'productDetail');
    expect(headers['Surrogate-Key']).toBe(info.tags.join(' '));
  });

  it('a private response is never shared: no surrogate keys, no public TTL, Vary: Authorization', () => {
    const headers = applyCacheHeaders(baseInfo({ visibility: 'private' }), 'productDetail');
    expect(headers['Surrogate-Key']).toBeUndefined();
    expect(headers['Cache-Control']).toBe('private, no-store');
    expect(headers['Vary']).toBe('Authorization');
  });

  it('the internal cache key never appears in any header', () => {
    const info = baseInfo();
    const headers = { ...applyCacheHeaders(info, 'productDetail') };
    const all = Object.entries(headers)
      .map(([name, value]) => `${name}:${value}`)
      .join('\n');
    expect(all).not.toContain(info.key as string);
    expect(all).not.toContain('mh-test'); // namespace stays internal
  });

  it('hit and degraded responses carry the same header policy (TTL is a route property)', () => {
    const hit = applyCacheHeaders(baseInfo({ hit: true, reason: 'hit' }), 'productDetail');
    const degraded = applyCacheHeaders(
      baseInfo({ degraded: true, reason: 'store-unavailable', key: null }),
      'productDetail',
    );
    expect(hit['Cache-Control']).toBe(degraded['Cache-Control']);
    expect(hit['Surrogate-Key']).toBe(degraded['Surrogate-Key']);
  });
});

// ─── Integration: through the real API pipeline ──────────────────────────────

function buildApi(): {
  api: CatalogApi;
  service: CatalogQueryService;
  store: MemoryCacheStore;
  port: FakeCatalogPort;
} {
  const store = new MemoryCacheStore();
  const port = new FakeCatalogPort();
  const service = createCatalogQueryService({
    port,
    store,
    generations: new MemoryGenerationStore(),
    namespace: 'mh-test-headers',
  });
  const api = createCatalogApi({ service, ids: () => ({ ...IDS }) });
  return { api, service, store, port };
}

const get = (api: CatalogApi, path: string): Promise<Response> =>
  api(new Request(`http://localhost${path}`));

describe('cache headers through the API', () => {
  it('a catalogue 200 carries Cache-Control + Surrogate-Key derived from the service tags', async () => {
    const { api, service } = buildApi();
    const response = await get(api, '/api/v1/products/pave-green-tourmaline-ring');
    expect(response.status).toBe(200);

    // The response's Surrogate-Key is exactly the tag set the service
    // computed for this read — the SAME set invalidateTag() matches on.
    const cached = await service.getProductBySlug('pave-green-tourmaline-ring');
    expect(response.headers.get('Surrogate-Key')).toBe(cached.cache.tags.join(' '));
    expect(response.headers.get('Surrogate-Key')).toContain('catalog.scope.products');
    expect(response.headers.get('Surrogate-Key')).toContain('catalog.generation.products=');
    expect(response.headers.get('Cache-Control')).toBe(
      `public, max-age=${CATALOG_SURFACES.productDetail.ttlSeconds}, stale-while-revalidate=${CATALOG_SURFACES.productDetail.ttlSeconds}`,
    );
  });

  it('list and taxonomy routes use their own documented TTLs', async () => {
    const { api } = buildApi();
    const list = await get(api, '/api/v1/products?limit=5');
    expect(list.headers.get('Cache-Control')).toContain('max-age=60');
    const taxonomy = await get(api, '/api/v1/taxonomy/metals');
    expect(taxonomy.headers.get('Cache-Control')).toContain('max-age=3600');
  });

  it('surrogate keys and the tag purge mechanism agree: purging the scope tag changes the served entry', async () => {
    const { api, service, store } = buildApi();
    const first = await get(api, '/api/v1/products/pave-green-tourmaline-ring');
    const surrogateKey = first.headers.get('Surrogate-Key') as string;

    // Purge via the documented mechanism (invalidateTag over the SAME tags).
    const removed = await service.invalidateTag('catalog.scope.products');
    expect(removed).toBeGreaterThan(0);
    // The purged tag is one of the emitted surrogate keys: a surrogate cache
    // receiving this purge would invalidate exactly this response.
    expect(surrogateKey.split(' ')).toContain('catalog.scope.products');
    expect(store.size()).toBe(0); // entry gone -> next read recomputes

    const second = await get(api, '/api/v1/products/pave-green-tourmaline-ring');
    expect(second.status).toBe(200);
  });

  it('a generation bump changes the cache key generation tag in the served headers', async () => {
    const { api, service } = buildApi();
    await get(api, '/api/v1/products/pave-green-tourmaline-ring');
    await service.bumpGeneration('products');
    const after = await get(api, '/api/v1/products/pave-green-tourmaline-ring');
    expect(after.headers.get('Surrogate-Key')).toContain('catalog.generation.products=1');
  });

  it('a degraded store (Redis down) still serves correct data with the same cache policy', async () => {
    const service = createCatalogQueryService({
      port: new FakeCatalogPort(),
      store: new FailingCacheStore(),
      generations: new MemoryGenerationStore(),
      namespace: 'mh-test-headers-degraded',
    });
    const api = createCatalogApi({ service, ids: () => ({ ...IDS }) });
    const response = await get(api, '/api/v1/products/pave-green-tourmaline-ring');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('public');
    expect(response.headers.get('Surrogate-Key')).toContain('catalog.scope.products');
  });

  it('error responses carry no cache headers (never cache a failure)', async () => {
    const { api, port } = buildApi();
    port.notFound.add('unknown-slug');
    const missing = await get(api, '/api/v1/products/unknown-slug');
    expect(missing.status).toBe(404);
    expect(missing.headers.get('Cache-Control')).toBeNull();
    expect(missing.headers.get('Surrogate-Key')).toBeNull();
  });
});
