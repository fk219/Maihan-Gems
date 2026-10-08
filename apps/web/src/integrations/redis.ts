/**
 * apps/web/src/integrations/redis.ts
 *
 * Task 7 — the shared Redis client factory.
 *
 * Redis is APPROVED for Phase 3 (SKILL_MATRIX_AND_TOOLING.md 14.1: Redis 7.x,
 * "Yes for Phase 3" as a phase-entry dependency; ADR-002: never truth). The
 * client library is its runtime implementation detail (SKILL_MATRIX 14.1 note
 * — ioredis is also the client named in technical_design/03's forbidden-import
 * table), so no new technology is introduced here.
 *
 * Failure semantics — the whole point of Task 7:
 *   - `enableOfflineQueue: false`  => a command issued while Redis is down
 *     REJECTS IMMEDIATELY instead of queueing forever. The caller degrades to
 *     Postgres rather than hanging on a dead cache.
 *   - `maxRetriesPerRequest: 1`    => bounded per-command retry.
 *   - `retryStrategy`              => the connection keeps retrying in the
 *     background (bounded backoff), so recovery is automatic; `maxAttempts:
 *     1` stops retrying, which is what the dead-endpoint tests use.
 *   - `lazyConnect`                => a process can start without Redis and
 *     never assumes it is there.
 *   - an `error` listener is always attached so a Redis error is RECORDED,
 *     never an unhandled `error` event that would take the process down.
 *
 * A cache client failure must NEVER become a catalogue failure: every store
 * operation throws, and the service layer converts a throw into a bypass
 * (see modules/catalog/application/catalog-query-service.ts).
 */
import Redis from 'ioredis';

export interface CreateRedisClientOptions {
  /** Stop reconnecting after this many attempts (tests use 1). Default: bounded infinite retry. */
  maxAttempts?: number;
  /** Per-command socket timeout in ms. Default 1000 — a cache is never worth waiting for. */
  connectTimeout?: number;
}

export interface RedisHandle {
  readonly client: Redis;
  /** Most recent connection error, for observability hooks. Never a secret. */
  lastConnectionError(): Error | null;
  close(): Promise<void>;
}

/**
 * Create a fail-fast Redis client. `lazyConnect` means the caller decides
 * when (or whether) to connect; commands reject while disconnected because
 * the offline queue is disabled.
 */
export function createRedisClient(url: string, options: CreateRedisClientOptions = {}): RedisHandle {
  const maxAttempts = options.maxAttempts ?? 0; // 0 => keep retrying (bounded backoff)
  let lastError: Error | null = null;

  const client = new Redis(url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: options.connectTimeout ?? 1000,
    retryStrategy(times: number): number | null {
      if (maxAttempts > 0 && times >= maxAttempts) return null;
      return Math.min(times * 100, 2000);
    },
  });

  client.on('error', (error: Error) => {
    lastError = error;
    // Recorded, not rethrown: Redis errors are expected input to the
    // degradation path (Task 7), not process-level failures.
  });

  return {
    client,
    lastConnectionError: () => lastError,
    async close(): Promise<void> {
      try {
        await client.quit();
      } catch {
        client.disconnect();
      }
    },
  };
}
