/**
 * apps/web/src/modules/catalog/infrastructure/feature-flag-generation-store.ts
 *
 * Read-through wiring for the worker's `search.generation_bump` jobs
 * (ADR-020 plane → cache plane): the worker records the monotonic
 * `search_cache_generation` counter in the LOCKED `feature_flags` table;
 * this decorator lifts that counter as a FLOOR for every catalogue cache
 * scope, so a cross-process bump (worker → API / storefront singletons)
 * retires cached catalogue reads even though the two processes never share
 * in-memory state.
 *
 * Failure mode (doc 06 / SoT 15.3): an unreadable flag is treated as "no new
 * generation known" — the wrapped store's own read decides the answer (the
 * documented "cache unusable, serve from Postgres" posture): a flag-read
 * failure here simply returns the base value and is retried after the poll
 * interval. It never keeps a NEWER flag generation from being honoured.
 */
import type { CacheScope, Generation } from '../application/cache-identity.js';
import type { GenerationStore } from '../application/generation-store.js';

export interface GenerationFloorStore extends GenerationStore {
  /** Manual probe used by tests: reads the flag immediately (no cache). */
  refreshFlag(): Promise<number>;
}

export interface FeatureFlagGenerationStoreOptions {
  /** Wrapped per-process store (Redis-backed when configured, memory otherwise). */
  readonly base: GenerationStore;
  /** Reads the monotonic generation from the feature flag; null on read failure. */
  readonly readFlagGeneration: () => Promise<number | null>;
  /** How long a successful flag read is trusted before re-reading (seconds). */
  readonly pollSeconds?: number;
}

export function createFeatureFlagGenerationStore(
  options: FeatureFlagGenerationStoreOptions,
): GenerationFloorStore {
  const base = options.base;
  const readFlagGeneration = options.readFlagGeneration;
  const pollMs = (options.pollSeconds ?? 30) * 1000;

  let cachedFlag: number | null = null;
  let cachedAt = 0;

  const currentFlag = async (): Promise<number> => {
    const now = Date.now();
    if (cachedFlag !== null && now - cachedAt < pollMs) return cachedFlag;
    // Failure backoff: a failed probe is cached as "last known (or 0)" for the
    // same poll window so a down database is not hammered on every read.
    if (now - cachedAt < pollMs) return cachedFlag ?? 0;
    cachedAt = now;
    try {
      const value = await readFlagGeneration();
      if (value !== null) cachedFlag = value;
    } catch {
      // Fail-open per the cache contract: keep the last-known generation.
    }
    return cachedFlag ?? 0;
  };

  return {
    async get(scope: CacheScope): Promise<Generation> {
      const baseGen = Number(await base.get(scope));
      const flagGen = await currentFlag();
      return String(Math.max(baseGen, flagGen) || 0);
    },
    async bump(scope: CacheScope): Promise<Generation> {
      return base.bump(scope);
    },
    async refreshFlag(): Promise<number> {
      cachedFlag = null;
      cachedAt = 0;
      return currentFlag().then((value) => value);
    },
  };
}
