import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCatalogQueryService,
  cacheNamespace,
} from '../index.js';
import {
  FakeCatalogPort,
} from '../testing/doubles.js';
import {
  MemoryCacheStore,
  MemoryGenerationStore,
} from '../infrastructure/cache-store.js';
import type { SearchQuery } from '@maihan/contracts';

const NS = cacheNamespace('test');

describe('Search Caching & Generation Invalidation (Phase 5 Task 10)', () => {
  let port: FakeCatalogPort;
  let store: MemoryCacheStore;
  let generations: MemoryGenerationStore;
  let service: ReturnType<typeof createCatalogQueryService>;

  beforeEach(() => {
    port = new FakeCatalogPort();
    store = new MemoryCacheStore();
    generations = new MemoryGenerationStore();
    service = createCatalogQueryService({
      port,
      store,
      generations,
      namespace: NS,
    });
  });

  it('serves repeated search queries from cache (cache-aside)', async () => {
    const query: SearchQuery = {
      query: 'blue sapphire',
      limit: 10,
    };

    const first = await service.search(query);
    expect(first.cache.hit).toBe(false);
    expect(first.cache.degraded).toBe(false);
    expect(port.calls.search).toBe(1);

    const second = await service.search(query);
    expect(second.cache.hit).toBe(true);
    expect(port.calls.search).toBe(1); // Not called again!
    expect(second.value).toEqual(first.value);
  });

  it('bumping search generation invalidates cached search results immediately', async () => {
    const query: SearchQuery = {
      query: 'emerald',
      limit: 10,
    };

    const first = await service.search(query);
    expect(first.cache.hit).toBe(false);
    expect(port.calls.search).toBe(1);

    const second = await service.search(query);
    expect(second.cache.hit).toBe(true);
    expect(port.calls.search).toBe(1);

    // Bump search generation atomically
    await service.bumpSearchGeneration();

    // Third call after bump: cache miss due to generation mismatch
    const third = await service.search(query);
    expect(third.cache.hit).toBe(false);
    expect(port.calls.search).toBe(2);
    expect(third.cache.generation).not.toBe(first.cache.generation);
  });

  it('caches search suggestions with prefix identity', async () => {
    const first = await service.suggest({ prefix: 'sap', limit: 5 });
    expect(first.cache.hit).toBe(false);
    expect(port.calls.suggest).toBe(1);

    const second = await service.suggest({ prefix: 'sap', limit: 5 });
    expect(second.cache.hit).toBe(true);
    expect(port.calls.suggest).toBe(1);
  });

  it('caches similar gemstones by gemRef', async () => {
    const first = await service.similarGemstones('K1551', 6);
    expect(first.cache.hit).toBe(false);
    expect(port.calls.similarGemstones).toBe(1);

    const second = await service.similarGemstones('K1551', 6);
    expect(second.cache.hit).toBe(true);
    expect(port.calls.similarGemstones).toBe(1);
  });
});
