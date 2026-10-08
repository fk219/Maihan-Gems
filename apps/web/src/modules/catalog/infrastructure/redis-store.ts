/**
 * apps/web/src/modules/catalog/infrastructure/redis-store.ts
 *
 * Task 7 — Redis implementations of the cache and generation contracts.
 *
 * Every method lets the Redis client's error REJECT: degradation is decided
 * one layer up (catalog-query-service), where a throw becomes a bypass to the
 * port. Nothing here catches, retries or fabricates a value — a cache layer
 * that silently swallows its own failures is exactly how a stale read becomes
 * invisible.
 *
 * Key discipline (technical_design/25 §6):
 *   - keys arrive PRE-BUILT from cache-identity.ts (versioned, namespaced,
 *     hash-derived, no PII); this layer never constructs catalogue keys;
 *   - the only keys this file names are its own generation counters,
 *     `{namespace}:gen:{scope}`, which are namespaced the same way;
 *   - TTLs always come from the surface policy (SoT 11.2 durations).
 *
 * Index TTLs are only ever EXTENDED, never shortened: an entry registered
 * under a tag must stay discoverable by that tag for at least as long as the
 * entry itself can exist, or tag-based invalidation would silently miss rows
 * (the generation safety net bounds that window, but why rely on the safety
 * net for a preventable race).
 */
import type Redis from 'ioredis';
import type { GenerationStore } from '../application/generation-store.js';
import type { CacheScope, Generation } from '../application/cache-identity.js';
import type { CacheStore } from './cache-store.js';

export class RedisCacheStore implements CacheStore {
  constructor(private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, 'EX', ttlSeconds);
  }

  async addToIndex(indexKeys: readonly string[], member: string, ttlSeconds: number): Promise<void> {
    if (indexKeys.length === 0) return;
    for (const indexKey of indexKeys) {
      await this.redis.sadd(indexKey, member);
      const existingTtl = await this.redis.ttl(indexKey);
      if (existingTtl < ttlSeconds) {
        await this.redis.expire(indexKey, ttlSeconds);
      }
    }
  }

  async members(indexKey: string): Promise<string[]> {
    return await this.redis.smembers(indexKey);
  }

  async del(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.redis.del(...keys);
  }
}

/**
 * Redis generation counters — the SoT 15.3 safety net:
 * `INCR` is atomic, so a bump is race-free, and because every cache key
 * embeds `(scope, generation)`, a bump retires the whole scope's keys without
 * scanning, while other scopes keep serving.
 *
 * Absent counter reads as generation `0`, matching the in-memory store, so
 * both backends mint the same keys for a cold start.
 */
export class RedisGenerationStore implements GenerationStore {
  constructor(
    private readonly redis: Redis,
    private readonly namespace: string,
  ) {}

  private key(scope: CacheScope): string {
    return `${this.namespace}:gen:${scope}`;
  }

  async get(scope: CacheScope): Promise<Generation> {
    const value = await this.redis.get(this.key(scope));
    return value ?? '0';
  }

  async bump(scope: CacheScope): Promise<Generation> {
    const next = await this.redis.incr(this.key(scope));
    return String(next);
  }
}
