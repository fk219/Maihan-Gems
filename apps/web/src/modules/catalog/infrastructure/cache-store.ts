/**
 * apps/web/src/modules/catalog/infrastructure/cache-store.ts
 *
 * Task 6 — the cache backend contract plus the in-memory implementation.
 *
 * The interface is deliberately small (get / set / index / members / del):
 * everything above it — key derivation, tags, generations, degradation — is
 * backend-independent, which is what lets Task 7 swap Redis in and out and
 * lets the degradation tests simulate every failure mode exactly.
 *
 * Index sets back the tag-based invalidation of SoT 15.3: every entry is
 * registered under its tags, so `invalidateTag` deletes exactly the entries
 * carrying that tag (plus the index itself).
 *
 * The memory implementation exists for tests and for single-process local
 * runs WITHOUT Redis. It is never a substitute source of truth: it only ever
 * holds values that came from Postgres in the first place (ADR-002).
 */
import type { GenerationStore } from '../application/generation-store.js';
import type { CacheScope, Generation } from '../application/cache-identity.js';

export interface CacheStore {
  /** Raw string value, or null on miss. Throws when the backend is unavailable. */
  get(key: string): Promise<string | null>;
  /** Write with TTL. Throws when the backend is unavailable. */
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** Register `member` under each index key (tag sets), TTL-aligned. */
  addToIndex(indexKeys: readonly string[], member: string, ttlSeconds: number): Promise<void>;
  /** All members of an index (tag set). Throws when the backend is unavailable. */
  members(indexKey: string): Promise<string[]>;
  /** Delete keys (entries and/or index sets). Throws when unavailable. */
  del(keys: string[]): Promise<void>;
}

/** A store that never holds anything: configured Redis absence, not failure. */
export class NullCacheStore implements CacheStore {
  async get(): Promise<string | null> {
    return null;
  }
  async set(): Promise<void> {
    /* no cache configured */
  }
  async addToIndex(): Promise<void> {
    /* no cache configured */
  }
  async members(): Promise<string[]> {
    return [];
  }
  async del(): Promise<void> {
    /* no cache configured */
  }
}

interface MemoryEntry {
  value: string;
  expiresAtMs: number;
}

interface MemoryIndex {
  members: Set<string>;
  expiresAtMs: number;
}

/**
 * TTL-aware in-memory store (tests, single-process local runs).
 * Now is injected so expiry is deterministic under test.
 */
export class MemoryCacheStore implements CacheStore {
  private readonly entries = new Map<string, MemoryEntry>();
  private readonly indexes = new Map<string, MemoryIndex>();

  constructor(private readonly now: () => number = Date.now) {}

  async get(key: string): Promise<string | null> {
    const entry = this.entries.get(key);
    if (entry === undefined) return null;
    if (entry.expiresAtMs <= this.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.entries.set(key, { value, expiresAtMs: this.now() + ttlSeconds * 1000 });
  }

  async addToIndex(indexKeys: readonly string[], member: string, ttlSeconds: number): Promise<void> {
    const expiresAtMs = this.now() + ttlSeconds * 1000;
    for (const indexKey of indexKeys) {
      const index = this.indexes.get(indexKey);
      if (index === undefined || index.expiresAtMs <= this.now()) {
        this.indexes.set(indexKey, { members: new Set([member]), expiresAtMs });
      } else {
        index.members.add(member);
        index.expiresAtMs = Math.max(index.expiresAtMs, expiresAtMs);
      }
    }
  }

  async members(indexKey: string): Promise<string[]> {
    const index = this.indexes.get(indexKey);
    if (index === undefined || index.expiresAtMs <= this.now()) return [];
    return [...index.members];
  }

  async del(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.entries.delete(key);
      this.indexes.delete(key);
    }
  }

  /** Test/introspection helper: how many live entries a key space holds. */
  size(): number {
    const cutoff = this.now();
    let live = 0;
    for (const entry of this.entries.values()) if (entry.expiresAtMs > cutoff) live += 1;
    return live;
  }
}

/** In-memory generation counters (tests, single-process local runs). */
export class MemoryGenerationStore implements GenerationStore {
  private readonly generations = new Map<CacheScope, number>();

  async get(scope: CacheScope): Promise<Generation> {
    return String(this.generations.get(scope) ?? 0);
  }

  async bump(scope: CacheScope): Promise<Generation> {
    const next = (this.generations.get(scope) ?? 0) + 1;
    this.generations.set(scope, next);
    return String(next);
  }
}
