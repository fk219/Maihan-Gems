/**
 * Task 6 — cache behaviour tests against the catalogue query service.
 *
 * Required matrix covered here:
 *   1/2/3/4. query dimensions -> cache differentiation (via the service)
 *   5. different resource -> different cache namespace
 *   6. relevant generation bump -> cache invalidated
 *   7. unrelated generation bump -> cache remains valid
 *  10. authorization-sensitive variation (private surface isolation)
 *   + tag-based invalidation scope, write-through, deterministic tags,
 *     degradation (Task 7 preview: store/generation failures) and the rule
 *     that database errors are never swallowed.
 */
import { describe, expect, it } from 'vitest';
import type { CatalogQueryPort } from '@maihan/contracts';
import { createCatalogQueryService, type CatalogQueryService } from './catalog-query-service.js';
import { cacheNamespace, surrogateKeys } from './cache-identity.js';
import { defaultSurfaces } from './cache-policy.js';
import {
  FakeCatalogPort,
  FailingCacheStore,
  FailingGenerationStore,
} from '../testing/doubles.js';
import { MemoryCacheStore, MemoryGenerationStore } from '../infrastructure/cache-store.js';
import type { GenerationStore } from './generation-store.js';

const NS = cacheNamespace('test');

interface Harness {
  port: FakeCatalogPort;
  store: FailingCacheStore;
  generations: GenerationStore;
  service: CatalogQueryService;
}

function harness(overrides?: {
  port?: CatalogQueryPort;
  store?: FailingCacheStore;
  generations?: GenerationStore;
  surfaces?: ReturnType<typeof defaultSurfaces>;
}): Harness {
  const port = (overrides?.port as FakeCatalogPort | undefined) ?? new FakeCatalogPort();
  const store = overrides?.store ?? new FailingCacheStore();
  const generations = overrides?.generations ?? new MemoryGenerationStore();
  const service = createCatalogQueryService({
    port,
    store,
    generations,
    namespace: NS,
    surfaces: overrides?.surfaces,
  });
  return { port, store, generations, service };
}

const baseQuery = { limit: 24, sort: 'price', direction: 'asc', filters: {} } as const;

describe('cache hit/miss and differentiation', () => {
  it('identical query hits the cache (port called once)', async () => {
    const h = harness();
    const first = await h.service.listProducts(baseQuery);
    const second = await h.service.listProducts(baseQuery);
    expect(first.cache.hit).toBe(false);
    expect(second.cache.hit).toBe(true);
    expect(h.port.calls.listProducts).toBe(1);
    expect(first.cache.key).toBe(second.cache.key);
    expect(second.cache.key).not.toBeNull();
  });

  it('2. different filters -> separate entries (no cross-contamination)', async () => {
    const h = harness();
    const a = await h.service.listProducts({ ...baseQuery, filters: { variety: ['tsavorite-garnet'] } });
    const b = await h.service.listProducts({ ...baseQuery, filters: { variety: ['padparadscha'] } });
    expect(a.cache.key).not.toBe(b.cache.key);
    expect(a.cache.hit).toBe(false);
    expect(b.cache.hit).toBe(false);
    expect(h.port.calls.listProducts).toBe(2);

    const aAgain = await h.service.listProducts({ ...baseQuery, filters: { variety: ['tsavorite-garnet'] } });
    expect(aAgain.cache.hit).toBe(true);
    expect(aAgain.cache.key).toBe(a.cache.key);
    expect(h.port.calls.listProducts).toBe(2);
  });

  it('3. different pagination cursor -> different cache entry', async () => {
    const h = harness();
    const first = await h.service.listProducts(baseQuery);
    const next = await h.service.listProducts({ ...baseQuery, cursor: 'eyJ2IjoxLCJzIjoicHJpY2UiLCJuIjoxfQ' });
    expect(first.cache.key).not.toBe(next.cache.key);
    expect(next.cache.hit).toBe(false);
    expect(h.port.calls.listProducts).toBe(2);
  });

  it('4. different sort -> different cache entry', async () => {
    const h = harness();
    await h.service.listProducts({ ...baseQuery, sort: 'price', direction: 'asc' });
    const sorted = await h.service.listProducts({ ...baseQuery, sort: 'weight', direction: 'asc' });
    expect(sorted.cache.hit).toBe(false);
    expect(h.port.calls.listProducts).toBe(2);
  });

  it('5. different resource -> different cache namespace (products vs taxonomy)', async () => {
    const h = harness();
    const products = await h.service.listProducts(baseQuery);
    const taxonomy = await h.service.getTaxonomy();
    expect(products.cache.key).toContain(':products:');
    expect(taxonomy.cache.key).toContain(':taxonomy:');
    expect(products.cache.key).not.toBe(taxonomy.cache.key);
  });

  it('detail reads are keyed by public identity (slug) and hit on repeat', async () => {
    const h = harness();
    const a = await h.service.getProductBySlug('green-tourmaline-ring-1');
    const b = await h.service.getProductBySlug('green-tourmaline-ring-1');
    const other = await h.service.getProductBySlug('other-slug');
    expect(a.cache.key).toContain(':products:product:green-tourmaline-ring-1:');
    expect(b.cache.hit).toBe(true);
    expect(other.cache.key).not.toBe(a.cache.key);
    expect(h.port.calls.getProductBySlug).toBe(2);
  });
});

describe('deterministic tags and surrogate metadata', () => {
  it('8/9. tags and keys are identical across independent runs of the same query', async () => {
    const first = harness();
    const second = harness();
    const a = await first.service.listProducts(baseQuery);
    const b = await second.service.listProducts(baseQuery);
    expect(a.cache.key).toBe(b.cache.key);
    expect(a.cache.tags).toEqual(b.cache.tags);
    expect(a.cache.tags).toContain('catalog.scope.products');
    expect(a.cache.tags).toContain('catalog.generation.products=0');
    expect(a.cache.generation).toBe('0');
    expect(a.cache.visibility).toBe('public');
  });
});

describe('generation-bump invalidation (SoT 15.3)', () => {
  it('6. relevant generation bump -> affected entries invalidated', async () => {
    const h = harness();
    await h.service.listProducts(baseQuery); // miss, stored under g=0
    const hit = await h.service.listProducts(baseQuery);
    expect(hit.cache.hit).toBe(true);

    await h.service.bumpGeneration('products');

    const after = await h.service.listProducts(baseQuery);
    expect(after.cache.hit).toBe(false);
    expect(after.cache.generation).toBe('1');
    expect(after.cache.key).not.toBe(hit.cache.key);
    expect(h.port.calls.listProducts).toBe(2); // miss, then post-bump miss; the middle read hit
  });

  it('6. generation bump applies to detail entries of the same scope too', async () => {
    const h = harness();
    await h.service.getProductBySlug('slug-a');
    expect((await h.service.getProductBySlug('slug-a')).cache.hit).toBe(true);
    await h.service.bumpGeneration('products');
    expect((await h.service.getProductBySlug('slug-a')).cache.hit).toBe(false);
  });

  it('7. unrelated generation bump -> unrelated responses remain cached', async () => {
    const h = harness();
    await h.service.listProducts(baseQuery);
    await h.service.getTaxonomy();

    await h.service.bumpGeneration('settings'); // unrelated scope

    const products = await h.service.listProducts(baseQuery);
    const taxonomy = await h.service.getTaxonomy();
    expect(products.cache.hit).toBe(true);
    expect(taxonomy.cache.hit).toBe(true);
    expect(h.port.calls.listProducts).toBe(1);
    expect(h.port.calls.getTaxonomy).toBe(1);
  });

  it('a generation bump never leaves a stale entry reachable', async () => {
    const h = harness();
    await h.service.listProducts(baseQuery);
    // Every stored entry embeds the generation that minted it.
    const entries = (h.store.underlying as unknown as { entries: Map<string, unknown> }).entries;
    const allKeys = JSON.stringify([...entries.keys()]);
    expect(allKeys).toContain(':g=0:');

    await h.service.bumpGeneration('products');
    const fresh = await h.service.listProducts(baseQuery);
    expect(fresh.cache.hit).toBe(false);
    expect(fresh.cache.key).toContain(':g=1:');
  });
});

describe('tag-based invalidation scope', () => {
  it('invalidating a scope tag removes only that scope entries', async () => {
    const h = harness();
    await h.service.listProducts(baseQuery);
    await h.service.getProductBySlug('slug-a');
    await h.service.getTaxonomy();

    const removed = await h.service.invalidateTag('catalog.scope.products');
    expect(removed).toBe(2);

    expect((await h.service.listProducts(baseQuery)).cache.hit).toBe(false);
    expect((await h.service.getProductBySlug('slug-a')).cache.hit).toBe(false);
    expect((await h.service.getTaxonomy()).cache.hit).toBe(true);
  });

  it('invalidating a single-resource tag removes exactly that entry', async () => {
    const h = harness();
    await h.service.getProductBySlug('slug-a');
    await h.service.getProductBySlug('slug-b');

    const removed = await h.service.invalidateTag('catalog.products.product.slug-a');
    expect(removed).toBe(1);

    expect((await h.service.getProductBySlug('slug-a')).cache.hit).toBe(false);
    expect((await h.service.getProductBySlug('slug-b')).cache.hit).toBe(true);
  });

  it('invalidating a generation tag retires exactly that generation', async () => {
    const h = harness();
    await h.service.listProducts(baseQuery);
    const removed = await h.service.invalidateTag('catalog.generation.products=0');
    expect(removed).toBe(1);
    expect((await h.service.listProducts(baseQuery)).cache.hit).toBe(false);
  });
});

describe('authorization-sensitive surfaces (Task 6/10 security)', () => {
  it('10. private surfaces isolate callers: no cross-actor cache sharing', async () => {
    const surfaces = defaultSurfaces();
    surfaces.productsList = { ...surfaces.productsList, visibility: 'private' };
    const h = harness({ surfaces });

    const asA = await h.service.listProducts(baseQuery, { actorKey: 'user-a@example.com' });
    expect(asA.cache.hit).toBe(false);
    expect(asA.cache.visibility).toBe('private');
    expect(asA.cache.key).not.toContain('user-a@example.com');

    // Same actor hits; a different actor must NOT see actor A's entry.
    const againAsA = await h.service.listProducts(baseQuery, { actorKey: 'user-a@example.com' });
    expect(againAsA.cache.hit).toBe(true);

    const asB = await h.service.listProducts(baseQuery, { actorKey: 'user-b@example.com' });
    expect(asB.cache.hit).toBe(false);
    expect(asB.cache.key).not.toBe(asA.cache.key);
    expect(h.port.calls.listProducts).toBe(2);
  });

  it('private surfaces emit no surrogate keys', async () => {
    const surfaces = defaultSurfaces();
    surfaces.productDetail = { ...surfaces.productDetail, visibility: 'private' };
    const h = harness({ surfaces });
    const result = await h.service.getProductBySlug('slug-a', { actorKey: 'user-a' });
    expect(result.cache.visibility).toBe('private');
    // Tags remain valid invalidation units, but they never reach a shared
    // cache: surrogateKeys() refuses private responses (Task 10).
    expect(result.cache.tags.length).toBeGreaterThan(0);
    expect(surrogateKeys(result.cache.tags, 'private')).toBeNull();
    expect(surrogateKeys(result.cache.tags, 'public')).not.toBeNull();
  });
});

describe('degradation and error isolation (Task 7 contract)', () => {
  it('GET failure degrades to the port and still returns correct data', async () => {
    const h = harness();
    h.store.fail('get');
    const result = await h.service.listProducts(baseQuery);
    expect(result.cache.degraded).toBe(true);
    expect(result.cache.reason).toBe('store-unavailable');
    expect(result.cache.key).toBeNull();
    expect(result.value.meta.limit).toBe(24);
    expect(h.port.calls.listProducts).toBe(1);
  });

  it('SET failure returns correct data and reports the degraded write', async () => {
    const h = harness();
    h.store.fail('set');
    const result = await h.service.listProducts(baseQuery);
    expect(result.value.meta.limit).toBe(24);
    expect(result.cache.degraded).toBe(true);
    expect(result.cache.reason).toBe('store-write-failed');
  });

  it('generation lookup failure bypasses the cache entirely', async () => {
    const generations = new FailingGenerationStore();
    generations.failing.add('get');
    const h = harness({ generations });
    const result = await h.service.getTaxonomy();
    expect(result.cache.degraded).toBe(true);
    expect(result.cache.reason).toBe('generation-unavailable');
    expect(result.cache.key).toBeNull();
    expect(result.cache.generation).toBeNull();
    expect(h.port.calls.getTaxonomy).toBe(1);
  });

  it('malformed cached payload is a miss, never a response', async () => {
    const h = harness();
    const first = await h.service.listProducts(baseQuery);
    const key = first.cache.key;
    expect(key).not.toBeNull();
    await h.store.underlying.set(key as string, 'not-json-at-all', 60);

    const second = await h.service.listProducts(baseQuery);
    expect(second.cache.hit).toBe(false);
    expect(second.cache.reason).toBe('malformed-entry');
    expect(second.value.meta.limit).toBe(24);
    expect(h.port.calls.listProducts).toBe(2);
  });

  it('a payload for a different contract shape is a miss (validated on read)', async () => {
    const h = harness();
    const first = await h.service.listProducts(baseQuery);
    await h.store.underlying.set(first.cache.key as string, JSON.stringify({ v: 1, value: { nonsense: true } }), 60);
    const second = await h.service.listProducts(baseQuery);
    expect(second.cache.hit).toBe(false);
    expect(second.value.items).toEqual([]);
  });

  it('database errors are NOT swallowed as cache degradation', async () => {
    const port = new FakeCatalogPort();
    port.failure = new Error('database exploded');
    const h = harness({ port });
    await expect(h.service.listProducts(baseQuery)).rejects.toThrow('database exploded');
  });

  it('degraded reads still populate nothing stale on recovery', async () => {
    const h = harness();
    h.store.fail('get');
    await h.service.listProducts(baseQuery); // bypassed
    h.store.recover('get');
    h.store.fail('set');
    await h.service.listProducts(baseQuery); // miss, write fails
    h.store.recover('set');
    const after = await h.service.listProducts(baseQuery);
    // Nothing usable was stored, so the next healthy read is a fresh miss.
    expect(after.cache.hit).toBe(false);
    expect(h.port.calls.listProducts).toBe(3);
  });
});

describe('memory store primitives', () => {
  it('honours TTL against an injected clock', async () => {
    let now = 1_000;
    const store = new MemoryCacheStore(() => now);
    await store.set('k', 'v', 60);
    expect(await store.get('k')).toBe('v');
    now += 61_000;
    expect(await store.get('k')).toBeNull();
  });

  it('index members expire with their TTL', async () => {
    let now = 1_000;
    const store = new MemoryCacheStore(() => now);
    await store.addToIndex(['tag-a'], 'key-a', 60);
    expect(await store.members('tag-a')).toEqual(['key-a']);
    now += 61_000;
    expect(await store.members('tag-a')).toEqual([]);
  });
});
