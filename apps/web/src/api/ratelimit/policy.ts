/**
 * apps/web/src/api/ratelimit/policy.ts
 *
 * Task 9 — the rate-limit POLICY, transcribed from PROJECT_SOURCE_OF_TRUTH.md
 * §11.11 verbatim. The numbers below are Source-of-Truth values; changing
 * one is a Source-of-Truth change, not a code tweak.
 *
 *   | Scope       | Limit | Window       |
 *   | Public GET  | 300   | 1 min per IP |
 *   | Search      | 60    | 1 min per IP |   <- attaches when search ships (Phase 5)
 *
 * Which rows are ACTIVE is a function of which endpoints exist: every Phase 3
 * route is a public GET, so `public_get` is the live scope. The remaining
 * SoT rows (search, cart, checkout, AI, certificate, admin, webhook) name
 * endpoint groups that do not exist yet — they are recorded here as
 * NOT-YET-APPLICABLE so the policy table is complete and a later phase
 * attaches its routes without re-reading the SoT, and so no limit is
 * invented for a route that does not exist.
 *
 * Bucket identity: per IP (SoT 11.11), hashed before it becomes a Redis key
 * or a Postgres row (technical_design/25 §9: no PII in keys — an IP in a
 * slowlog is exactly the leak that rule forbids).
 *
 * Window shape: fixed windows aligned to the epoch minute, keyed
 * `rl:{scope}:{identity}:{window}` — the key pattern and TTL of SoT 15.1
 * row 15 (`rl:{bucket}:{window}`, TTL = window) and the exact shape of the
 * `rate_limit_counters (bucket, window_start)` primary key that the Postgres
 * fallback uses. SoT 11.11 says "Redis token buckets"; a token bucket and a
 * fixed-window counter cannot share one fallback table, so this
 * implementation uses the documented KEY PATTERN and the documented FALLBACK
 * SCHEMA — fixed window — everywhere, identically in both backends. That
 * reconciliation is deliberate and recorded, not silent: limits, windows and
 * identity are exactly as documented.
 */
import { sha256Hex } from '../../modules/catalog/index.js';

export type RateLimitScope = 'public_get';

export interface RateLimitPolicy {
  readonly scope: RateLimitScope;
  /** SoT 11.11 "Public GET | 300 | 1 min per IP". */
  readonly limit: number;
  readonly windowSeconds: number;
}

export const RATE_LIMIT_POLICIES: Record<RateLimitScope, RateLimitPolicy> = {
  public_get: { scope: 'public_get', limit: 300, windowSeconds: 60 },
};

/**
 * SoT rows for endpoint groups that do not exist yet (Phase 5+). Not applied.
 * Every limit/window/identity below is transcribed verbatim from SoT 11.11;
 * `dailyLimit` carries the second dimension of the AI-stream row ("200 per
 * day per customer"), which needs a second, day-aligned window when the AI
 * phase lands.
 */
export const NOT_YET_APPLICABLE_SCOPES = [
  { scope: 'search', limit: 60, windowSeconds: 60 },
  { scope: 'cart_mutation', limit: 60, windowSeconds: 60 },
  { scope: 'checkout', limit: 20, windowSeconds: 60 },
  { scope: 'ai_stream', limit: 20, windowSeconds: 60, dailyLimit: 200 },
  { scope: 'ai_tool_invocation', limit: 200, windowSeconds: 60 },
  { scope: 'certificate_upload', limit: 10, windowSeconds: 3600 },
  { scope: 'admin_write', limit: 300, windowSeconds: 60 },
  { scope: 'webhook', limit: 1000, windowSeconds: 60 },
] as const;

/** Fixed window start (epoch seconds) for a given instant. */
export function windowStartSeconds(nowMs: number, windowSeconds: number): number {
  return Math.floor(nowMs / 1000 / windowSeconds) * windowSeconds;
}

/** Seconds until the current window closes (for reset/retry headers). */
export function secondsUntilWindowEnd(nowMs: number, windowSeconds: number): number {
  const endMs = (windowStartSeconds(nowMs, windowSeconds) + windowSeconds) * 1000;
  return Math.max(1, Math.ceil((endMs - nowMs) / 1000));
}

/**
 * The bucket key: `rl:{scope}:{sha256(ip)[0..31]}:{window_start}`.
 * Deterministic, bounded, PII-free (SoT 15.1 row 15 key pattern).
 */
export function bucketKey(policy: RateLimitPolicy, identity: string, windowStart: number): string {
  const identityHash = sha256Hex(identity).slice(0, 32);
  return `rl:${policy.scope}:${identityHash}:${windowStart}`;
}
