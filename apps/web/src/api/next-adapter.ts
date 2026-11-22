/**
 * apps/web/src/api/next-adapter.ts
 *
 * P1.1 — the Next.js mount for the framework-free handler API.
 *
 * The handler pipeline (`createCatalogApi`) was always transport-agnostic: it
 * takes a web `Request` and returns a web `Response`. Until now it was only
 * reachable through `node:http` (`server.ts`, package script `start`), so the
 * deployed website had no API surface at all. This module wires exactly the
 * same pipeline into the Next App Router, which is the single documented
 * deployment shape (P1.4).
 *
 * Why a singleton:
 *   - One connection pool per server process, not one per request.
 *   - Next hot-reloads modules in development; a module-level promise keeps
 *     the pool stable across reloads and avoids leaking sockets.
 *
 * Failure mode: configuration is validated at startup. If `DATABASE_URL` is
 * absent the API answers 503 with the standard envelope instead of crashing
 * the whole Next server — the storefront must still render its shell.
 */
import 'server-only';
import { loadRuntimeConfig } from '@maihan/config';
import { createCatalogDatabase, createCatalogQueryPort, createPool } from '@maihan/db';
import type { CatalogDatabase } from '@maihan/db';
import {
  MemoryGenerationStore,
  NullCacheStore,
  RedisCacheStore,
  RedisGenerationStore,
  cacheNamespace,
  createCatalogQueryService,
} from '../modules/catalog/index.js';
import { createRedisClient, type RedisHandle } from '../integrations/redis.js';
import { createMediaStorage } from '../integrations/media-storage.js';
import { createRateLimitGate } from './ratelimit/gate.js';
import { RATE_LIMIT_POLICIES } from './ratelimit/policy.js';
import { createBackendChain } from './ratelimit/limiter.js';
import { createCatalogApi, type CatalogApi } from './index.js';
import type { CacheStore, GenerationStore } from '../modules/catalog/index.js';

interface Wiring {
  api: CatalogApi;
  db: CatalogDatabase;
  close(): Promise<void>;
}

/**
 * `globalThis` keeps the pool across Next's dev module reloads. Production
 * never reloads, so this is a no-op there.
 */
const GLOBAL_KEY = Symbol.for('maihan.api.wiring.v1');
type GlobalWithWiring = typeof globalThis & { [GLOBAL_KEY]?: Promise<Wiring> };

async function wire(): Promise<Wiring> {
  const config = loadRuntimeConfig();
  const namespace = cacheNamespace(config.environment);
  const pool = createPool(config.databaseUrl);
  const catalogDatabase = createCatalogDatabase(pool);
  const catalogPort = createCatalogQueryPort(catalogDatabase);

  let store: CacheStore = new NullCacheStore();
  let generations: GenerationStore = new MemoryGenerationStore();
  let redis: RedisHandle | null = null;

  if (config.redisUrl !== null) {
    redis = createRedisClient(config.redisUrl);
    // Best-effort: Redis is acceleration, never truth. A failed connection
    // degrades to bypass and must not fail the request.
    await redis.client.connect().catch(() => undefined);
    store = new RedisCacheStore(redis.client);
    generations = new RedisGenerationStore(redis.client, namespace);
  }

  const service = createCatalogQueryService({ port: catalogPort, store, generations, namespace });

  const rateLimit = createRateLimitGate({
    policy: RATE_LIMIT_POLICIES.public_get,
    backends: createBackendChain({
      redis: redis?.client ?? null,
      db: catalogDatabase,
      policy: RATE_LIMIT_POLICIES.public_get,
    }),
    failureMode: 'allow',
  });

  const mediaStorage = createMediaStorage(config.mediaStorage);
  const api = createCatalogApi({
    service,
    rateLimit,
    db: catalogDatabase,
    ...(mediaStorage === null ? {} : { mediaStorage }),
  });

  return {
    api,
    db: catalogDatabase,
    async close(): Promise<void> {
      if (redis !== null) await redis.close();
      await pool.end();
    },
  };
}

export async function getCatalogApi(): Promise<CatalogApi> {
  return (await getWiring()).api;
}

/** Server-component access to the same pool the API uses. */
export async function getServerDb(): Promise<CatalogDatabase> {
  return (await getWiring()).db;
}

async function getWiring(): Promise<Wiring> {
  const holder = globalThis as GlobalWithWiring;
  let wiring = holder[GLOBAL_KEY];
  if (wiring === undefined) {
    wiring = wire();
    holder[GLOBAL_KEY] = wiring;
  }
  try {
    return await wiring;
  } catch (error) {
    // Do not cache a failed wiring: a corrected environment must recover on
    // the next request without a restart.
    delete holder[GLOBAL_KEY];
    throw error;
  }
}
