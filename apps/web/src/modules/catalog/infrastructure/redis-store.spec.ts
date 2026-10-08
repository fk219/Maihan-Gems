/**
 * Task 7 — Redis degradation tests.
 *
 * Two shapes, mirroring the packages/db suite's graceful-degradation rule:
 *   1. DEAD REDIS (runs everywhere, no infrastructure needed): a client
 *      pointed at a closed endpoint proves every operation rejects FAST and
 *      the catalogue service degrades to the port — the required chain
 *      REDIS FAILURE -> CACHE BYPASSED -> POSTGRES QUERY -> CORRECT RESPONSE
 *      (the port stands in for Postgres here; the end-to-end chain against a
 *      live database is asserted in the HTTP integration suite).
 *   2. LIVE REDIS (`REDIS_URL` set): real round trips, real generation-bump
 *      invalidation, real tag invalidation, real TTLs — skipped, never
 *      faked, when no Redis is available.
 *
 * Regression property under test: Redis can NEVER become the only source of
 * truth. Whatever Redis returns — nothing, garbage, or a stale generation —
 * the response comes from the port and satisfies the contract.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProductListResultSchema } from '@maihan/contracts';
import { createRedisClient, type RedisHandle } from '../../../integrations/redis.js';
import { RedisCacheStore, RedisGenerationStore } from './redis-store.js';
import { MemoryGenerationStore, NullCacheStore } from './cache-store.js';
import { createCatalogQueryService } from '../application/catalog-query-service.js';
import { cacheNamespace } from '../application/cache-identity.js';
import { FakeCatalogPort, FailingCacheStore } from '../testing/doubles.js';

const REDIS_URL = process.env['REDIS_URL'] ?? null;
const NS = cacheNamespace('test');

/** A client whose connect attempt fails immediately against a closed port. */
async function deadRedis(): Promise<RedisHandle> {
  const handle = createRedisClient('redis://127.0.0.1:6390', { maxAttempts: 1, connectTimeout: 300 });
  await handle.client.connect().catch(() => undefined);
  return handle;
}

const baseQuery = { limit: 24, sort: 'price', direction: 'asc', filters: {} } as const;

// ─── Shape 1: Redis unavailable (always runs) ────────────────────────────────

describe('Redis unavailable — fast rejection and bypass', () => {
  const handles: RedisHandle[] = [];

  afterAll(async () => {
    for (const handle of handles) await handle.close();
  });

  async function deadStore(): Promise<RedisCacheStore> {
    const handle = await deadRedis();
    handles.push(handle);
    return new RedisCacheStore(handle.client);
  }

  it('every cache operation rejects instead of queueing against a dead Redis', async () => {
    const store = await deadStore();
    await expect(store.get('any')).rejects.toThrow();
    await expect(store.set('any', 'v', 60)).rejects.toThrow();
    await expect(store.addToIndex(['tag'], 'key', 60)).rejects.toThrow();
    await expect(store.members('tag')).rejects.toThrow();
    await expect(store.del(['key'])).rejects.toThrow();
  });

  it('generation lookup failure -> cache bypassed -> port consulted -> correct response', async () => {
    const handle = await deadRedis();
    handles.push(handle);
    const port = new FakeCatalogPort();
    const service = createCatalogQueryService({
      port,
      store: new RedisCacheStore(handle.client),
      generations: new RedisGenerationStore(handle.client, NS),
      namespace: NS,
    });

    const result = await service.listProducts(baseQuery);
    expect(result.cache.degraded).toBe(true);
    expect(result.cache.reason).toBe('generation-unavailable');
    expect(result.cache.key).toBeNull();
    expect(result.cache.hit).toBe(false);
    expect(port.calls.listProducts).toBe(1);
    // Contract-valid, port-sourced data — nothing stale, nothing fabricated.
    expect(() => ProductListResultSchema.parse(result.value)).not.toThrow();
    expect(result.value.meta.limit).toBe(24);
  });

  it('healthy generations + dead cache backend -> store-unavailable bypass, still correct', async () => {
    const store = await deadStore();
    const port = new FakeCatalogPort();
    const service = createCatalogQueryService({
      port,
      store,
      generations: new MemoryGenerationStore(),
      namespace: NS,
    });

    const first = await service.listProducts(baseQuery);
    const second = await service.listProducts(baseQuery);
    expect(first.cache.reason).toBe('store-unavailable');
    expect(second.cache.reason).toBe('store-unavailable');
    expect(port.calls.listProducts).toBe(2); // every read hit the source of truth
    expect(second.value).toEqual(first.value);
  });

  it('SET failure after a fresh read still returns correct data (degraded write)', async () => {
    // Read path healthy, write path failing: the value is correct either way.
    const port = new FakeCatalogPort();
    const healthyThenFailing = new FailingCacheStore();
    healthyThenFailing.fail('set');
    const service = createCatalogQueryService({
      port,
      store: healthyThenFailing,
      generations: new MemoryGenerationStore(),
      namespace: NS,
    });
    const result = await service.listProducts(baseQuery);
    expect(result.value.meta.limit).toBe(24);
    expect(result.cache.reason).toBe('store-write-failed');
    expect(result.cache.degraded).toBe(true);
  });

  it('invalidation (members/DEL) failure surfaces loudly and reads stay correct', async () => {
    const store = await deadStore();
    const port = new FakeCatalogPort();
    const service = createCatalogQueryService({
      port,
      store,
      generations: new MemoryGenerationStore(),
      namespace: NS,
    });

    await expect(service.invalidateTag('catalog.scope.products')).rejects.toThrow();

    // A failed invalidation cannot poison reads: with the same dead backend,
    // every read bypasses to the source of truth. (If Redis later recovers
    // while a tag delete was lost, staleness is bounded by the documented
    // TTL — technical_design/25 §12 "Lost invalidation", and by the
    // generation safety net on the next bump.)
    const result = await service.listProducts(baseQuery);
    expect(result.value.meta.limit).toBe(24);
    expect(result.cache.degraded).toBe(true);
  });

  it('generation bump failure rejects without corrupting subsequent reads', async () => {
    const handle = await deadRedis();
    handles.push(handle);
    const port = new FakeCatalogPort();
    const generations = new RedisGenerationStore(handle.client, NS);
    const service = createCatalogQueryService({
      port,
      store: new RedisCacheStore(handle.client),
      generations,
      namespace: NS,
    });

    await expect(service.bumpGeneration('products')).rejects.toThrow();
    const result = await service.listProducts(baseQuery);
    expect(result.value.meta.limit).toBe(24);
    expect(result.cache.degraded).toBe(true);
  });

  it('regression: a dead Redis can never be the only source of truth', async () => {
    const store = await deadStore();
    const port = new FakeCatalogPort();
    const service = createCatalogQueryService({
      port,
      store,
      generations: new MemoryGenerationStore(),
      namespace: NS,
    });

    // Whatever we ask for, the answer comes from the port and is
    // contract-valid — identical to a run with no cache at all.
    const withDeadRedis = await service.listProducts(baseQuery);
    const withNoCache = await createCatalogQueryService({
      port,
      store: new NullCacheStore(), // configured Redis absence: pure bypass
      generations: new MemoryGenerationStore(),
      namespace: NS,
    }).listProducts(baseQuery);

    expect(withDeadRedis.value).toEqual(withNoCache.value);
    expect(withDeadRedis.cache.degraded).toBe(true);
    expect(withDeadRedis.cache.key).toBeNull(); // bypassed, no key minted without a generation
    expect(withNoCache.cache.hit).toBe(false);
  });
});

// ─── Shape 2: live Redis (REDIS_URL) ─────────────────────────────────────────

const describeLive = REDIS_URL === null ? describe.skip : describe;

describeLive('live Redis integration', () => {
  let handle: RedisHandle;
  let store: RedisCacheStore;
  let generations: RedisGenerationStore;

  beforeAll(async () => {
    const h = createRedisClient(REDIS_URL as string, { connectTimeout: 1000 });
    await h.client.connect();
    handle = h;
    store = new RedisCacheStore(handle.client);
    generations = new RedisGenerationStore(handle.client, NS);
  });

  const cleanupKeys = async (keys: string[]): Promise<void> => {
    if (keys.length > 0) await handle.client.del(...keys);
  };

  afterAll(async () => {
    if (handle !== undefined) await handle.close();
  });

  it('round-trips values with TTL, index membership and deletion', async () => {

    const key = `${NS}:v1:products:list:roundtrip:g=0:pub`;
    await store.set(key, 'payload', 60);
    expect(await store.get(key)).toBe('payload');
    expect(await handle.client.ttl(key)).toBeGreaterThan(0);

    await store.addToIndex(['tag-a', 'tag-b'], key, 60);
    expect(await store.members('tag-a')).toContain(key);
    expect(await store.members('tag-b')).toContain(key);

    // Index TTL is extended, never shortened.
    const shortLived = `${NS}:v1:products:list:short:g=0:pub`;
    await store.addToIndex(['tag-a'], shortLived, 1);
    expect(await handle.client.ttl('tag-a')).toBeGreaterThanOrEqual(59);

    await store.del([key, shortLived, 'tag-a', 'tag-b']);
    expect(await store.get(key)).toBeNull();
    expect(await store.members('tag-a')).toEqual([]);
    await cleanupKeys([key, shortLived]);
  });

  it('generation counters start at 0 and bump atomically', async () => {
    generations = new RedisGenerationStore(handle.client, NS);
    const key = `${NS}:gen:gemstones`;
    await handle.client.del(key);

    expect(await generations.get('gemstones')).toBe('0');
    expect(await generations.bump('gemstones')).toBe('1');
    expect(await generations.get('gemstones')).toBe('1');
    expect(await generations.bump('gemstones')).toBe('2');
    // Bumping one scope does not disturb another.
    expect(await generations.get('products')).toBe('0');
    await handle.client.del(key);
  });

  it('service over live Redis: miss -> hit -> generation bump invalidates', async () => {
    store = new RedisCacheStore(handle.client);
    generations = new RedisGenerationStore(handle.client, NS);
    const port = new FakeCatalogPort();
    const service = createCatalogQueryService({ port, store, generations, namespace: NS });

    const genKey = `${NS}:gen:products`;
    await handle.client.del(genKey);

    const miss = await service.listProducts(baseQuery);
    expect(miss.cache.hit).toBe(false);
    const hit = await service.listProducts(baseQuery);
    expect(hit.cache.hit).toBe(true);
    expect(port.calls.listProducts).toBe(1);

    await service.bumpGeneration('products');
    const afterBump = await service.listProducts(baseQuery);
    expect(afterBump.cache.hit).toBe(false);
    expect(afterBump.cache.generation).toBe('1');
    expect(afterBump.cache.key).not.toBe(hit.cache.key);
    expect(port.calls.listProducts).toBe(2);

    // Stale entry from generation 0 is unreachable, not merely overwritten.
    expect(await store.get(hit.cache.key as string)).not.toBeNull();
    expect(afterBump.cache.key).not.toBe(hit.cache.key);

    await cleanupKeys([miss.cache.key as string, afterBump.cache.key as string, genKey, 'tag']);
  });

  it('service over live Redis: tag invalidation deletes exactly the tagged entries', async () => {
    store = new RedisCacheStore(handle.client);
    generations = new RedisGenerationStore(handle.client, NS);
    const port = new FakeCatalogPort();
    const service = createCatalogQueryService({ port, store, generations, namespace: NS });

    const product = await service.getProductBySlug('tag-invalidation-slug');
    const taxonomy = await service.getTaxonomy();
    expect(product.cache.hit).toBe(false);

    const removed = await service.invalidateTag('catalog.scope.products');
    expect(removed).toBeGreaterThanOrEqual(1);

    expect((await service.getProductBySlug('tag-invalidation-slug')).cache.hit).toBe(false);
    expect((await service.getTaxonomy()).cache.hit).toBe(true);

    await cleanupKeys([product.cache.key as string, taxonomy.cache.key as string]);
  });

  it('malformed payload in real Redis is a miss, never a response', async () => {
    store = new RedisCacheStore(handle.client);
    generations = new RedisGenerationStore(handle.client, NS);
    const port = new FakeCatalogPort();
    const service = createCatalogQueryService({ port, store, generations, namespace: NS });

    const first = await service.listProducts(baseQuery);
    const key = first.cache.key as string;
    await store.set(key, '{ not json', 60);

    const second = await service.listProducts(baseQuery);
    expect(second.cache.hit).toBe(false);
    expect(second.cache.reason).toBe('malformed-entry');
    expect(ProductListResultSchema.parse(second.value)).toBeDefined();
    expect(port.calls.listProducts).toBe(2);

    await cleanupKeys([key]);
  });
});
