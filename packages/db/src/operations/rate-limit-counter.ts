/**
 * packages/db/src/operations/rate-limit-counter.ts
 *
 * Task 9 — the Postgres fallback counter for rate limiting
 * (PROJECT_SOURCE_OF_TRUTH.md 11.11: "Implemented with Redis token buckets
 * plus a Postgres fallback counter (`rate_limit_counters`) when Redis is
 * unavailable"; technical_design/01: "Rate limit checked -> Redis, Postgres
 * fallback").
 *
 * This package owns the query; the LIMIT POLICY (300/min per IP for public
 * GETs, etc.) lives in the API layer. The repository exposes exactly one
 * operation — an atomic increment that returns the new count for the
 * `(bucket, window_start)` window — because the window counter must be
 * race-free under concurrent requests.
 *
 * The table is part of the LOCKED schema (migration 0014_operations.sql):
 *   rate_limit_counters (bucket TEXT, window_start TIMESTAMPTZ, count BIGINT,
 *                        PRIMARY KEY (bucket, window_start))
 * No migration changes; no second counter table.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';

export interface RateLimitIncrement {
  /** New count for this window after the increment. */
  count: number;
}

/**
 * Atomically increment the window counter and return the new count.
 * `bucket` is the opaque, already-hashed bucket key from the API layer
 * (no PII reaches this table — technical_design/25 §9).
 */
export async function incrementRateLimitCounter(
  db: CatalogDatabase,
  bucket: string,
  windowStart: Date,
): Promise<RateLimitIncrement> {
  const statement = sql`
    INSERT INTO rate_limit_counters (bucket, window_start, count)
    VALUES (${bucket}, ${windowStart}, 1)
    ON CONFLICT (bucket, window_start)
    DO UPDATE SET count = rate_limit_counters.count + 1
    RETURNING count
  `;
  const result = await db.execute(statement);
  const row = (result.rows as unknown as Array<{ count: string | number }>)[0];
  if (row === undefined) {
    throw new Error('rate_limit_counters increment returned no row');
  }
  return { count: Number(row.count) };
}
