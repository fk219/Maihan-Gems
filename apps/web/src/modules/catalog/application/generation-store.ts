/**
 * apps/web/src/modules/catalog/application/generation-store.ts
 *
 * Task 6 — generation-bump invalidation (PROJECT_SOURCE_OF_TRUTH.md 15.3):
 *
 *   "The generation bump is the safety net: even if a tag-based delete is
 *    lost, a generation change makes all old search keys unreachable."
 *
 * Every catalogue cache key embeds its scope's generation (cache-identity.ts),
 * so bumping a scope's generation atomically retires every key in that scope
 * without scanning keys — and ONLY that scope's keys, because each scope owns
 * its own counter (an unrelated bump must never invalidate unrelated
 * responses).
 *
 * The interface lives in the application layer; the Redis and in-memory
 * implementations live in infrastructure/. A failing implementation must be
 * treated as "cache unusable, serve from Postgres" by the caller (Task 7) —
 * never as "keep the old generation".
 */
import type { CacheScope, Generation } from './cache-identity.js';

export interface GenerationStore {
  /** Current generation for a scope. Throws when the backend is unavailable. */
  get(scope: CacheScope): Promise<Generation>;
  /** Bump (increment) the scope's generation; returns the new value. */
  bump(scope: CacheScope): Promise<Generation>;
}
