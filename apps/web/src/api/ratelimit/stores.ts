/**
 * apps/web/src/api/ratelimit/stores.ts
 *
 * Task 9 — the rate-limit BACKENDS. One interface, three implementations,
 * so the limiter is written once against `RateLimitStore` and the backend
 * chain (Redis primary, Postgres fallback — SoT 11.11 "Redis token buckets
 * plus a Postgres fallback counter (`rate_limit_counters`) when Redis is
 * unavailable") is a composition decision, not a code fork.
 *
 * Every backend increments the SAME bucket key for the SAME fixed window and
 * returns the new count. The window shape is the documented one:
 * SoT 15.1 row 15 key pattern `rl:{bucket}:{window}` and the LOCKED
 * `rate_limit_counters (bucket, window_start)` primary key (migration
 * 0014_operations.sql). The policy reconciliation (fixed window vs the
 * SoT's "token buckets" wording) is recorded in policy.ts.
 *
 * Failure semantics: EVERY method rejects on failure and never swallows an
 * error — the limiter catches, tries the next backend, and only when the
 * whole chain fails applies the documented failure mode. A silent `return 0`
 * here would mean "everyone is under the limit", which is exactly the wrong
 * default for an abuse control.
 */
import { incrementRateLimitCounter, type CatalogDatabase } from '@maihan/db';
import type { Redis } from 'ioredis';

/**
 * A counting backend for one fixed window. `increment` is atomic and returns
 * the new count for `(bucket, windowStart)`; implementations reject on
 * backend failure.
 */
export interface RateLimitStore {
  increment(bucket: string, windowStart: number): Promise<number>;
}

/**
 * Redis primary backend: `INCR` + `EXPIRE` (TTL = window). The bucket key
 * already embeds the window start, so each window is its own key and expiry
 * is pure garbage collection — correctness never depends on the TTL.
 *
 * `EXPIRE` is issued only when the key was just created (count === 1). The
 * residual risk — a crash between INCR and EXPIRE leaves a key without a
 * TTL — costs memory, never correctness: the next increment in a later
 * window is a different key. Any failure here rejects and the Postgres
 * fallback takes over.
 */
export class RedisRateLimitStore implements RateLimitStore {
  constructor(
    private readonly redis: Redis,
    private readonly windowSeconds: number,
  ) {}

  // The window start is not a parameter here: the bucket key already embeds
  // it (policy.ts), so each fixed window is its own Redis key.
  async increment(bucket: string): Promise<number> {
    const count = await this.redis.incr(bucket);
    if (count === 1) await this.redis.expire(bucket, this.windowSeconds);
    return count;
  }
}

/**
 * Postgres fallback backend: the atomic
 * `INSERT … ON CONFLICT DO UPDATE … RETURNING count` in packages/db
 * (the LOCKED `rate_limit_counters` table; apps/web may not write SQL).
 */
export class PostgresRateLimitStore implements RateLimitStore {
  constructor(private readonly db: CatalogDatabase) {}

  async increment(bucket: string, windowStart: number): Promise<number> {
    const result = await incrementRateLimitCounter(this.db, bucket, new Date(windowStart * 1000));
    return result.count;
  }
}

/**
 * In-process backend for two situations: no Redis configured (local runs —
 * per-process limiting is honest and strictly stricter than no limiting), and
 * the deterministic unit tests. Counts are pruned to the current window on
 * every increment so the map cannot grow unbounded.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly counts = new Map<string, number>();

  async increment(bucket: string, windowStart: number): Promise<number> {
    // Prune windows older than the one being incremented (the bucket key
    // embeds the window start, so old entries are unreachable anyway).
    for (const [key] of this.counts) {
      const keyWindow = Number(key.slice(key.lastIndexOf(':') + 1));
      if (Number.isFinite(keyWindow) && keyWindow < windowStart) this.counts.delete(key);
    }
    const next = (this.counts.get(bucket) ?? 0) + 1;
    this.counts.set(bucket, next);
    return next;
  }

  /** Test helper: forget every counter (simulates a fresh process). */
  clear(): void {
    this.counts.clear();
  }
}
