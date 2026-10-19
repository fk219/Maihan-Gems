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

/**
 * The SoT 11.11 scopes. `public_get` was the only ACTIVE scope while the
 * catalogue API was the sole surface; every commerce, AI, certificate, admin
 * and webhook group now exists, so the full table is live (Phase 13
 * remediation M-09). Limits/windows are SoT values, never invented here.
 */
export type RateLimitScope =
  | 'public_get'
  | 'search'
  | 'cart_mutation'
  | 'checkout'
  | 'ai_stream'
  | 'ai_tool_invocation'
  | 'certificate_upload'
  | 'admin_write'
  | 'webhook';

export interface RateLimitPolicy {
  readonly scope: RateLimitScope;
  /** SoT 11.11 "Public GET | 300 | 1 min per IP". */
  readonly limit: number;
  readonly windowSeconds: number;
  /** SoT 11.11 AI-stream second dimension: "200 per day per customer". */
  readonly dailyLimit?: number;
}

export const RATE_LIMIT_POLICIES: Record<RateLimitScope, RateLimitPolicy> = {
  public_get: { scope: 'public_get', limit: 300, windowSeconds: 60 },
  search: { scope: 'search', limit: 60, windowSeconds: 60 },
  cart_mutation: { scope: 'cart_mutation', limit: 60, windowSeconds: 60 },
  checkout: { scope: 'checkout', limit: 20, windowSeconds: 60 },
  ai_stream: { scope: 'ai_stream', limit: 20, windowSeconds: 60, dailyLimit: 200 },
  ai_tool_invocation: { scope: 'ai_tool_invocation', limit: 200, windowSeconds: 60 },
  certificate_upload: { scope: 'certificate_upload', limit: 10, windowSeconds: 3600 },
  admin_write: { scope: 'admin_write', limit: 300, windowSeconds: 60 },
  webhook: { scope: 'webhook', limit: 1000, windowSeconds: 60 },
};

/**
 * What to do when EVERY rate-limit backend fails. Doc 06 failure modes:
 * reads continue ('allow'); money, uploads and abuse-sensitive writes fail
 * closed ('reject') — the Postgres fallback must be down for this to fire,
 * in which case those endpoints are unusable anyway.
 */
export const SCOPE_FAILURE_MODES: Record<RateLimitScope, 'allow' | 'reject'> = {
  public_get: 'allow',
  search: 'allow',
  cart_mutation: 'allow',
  checkout: 'reject',
  ai_stream: 'reject',
  ai_tool_invocation: 'allow',
  certificate_upload: 'reject',
  admin_write: 'allow',
  webhook: 'allow',
};

/**
 * Resolve the SoT scope for a registered route. Route ids are the stable
 * handler names from routes.ts; paths are the fallback discriminator.
 */
export function scopeForRoute(
  _routeId: string,
  path: string,
  method: string,
): RateLimitScope {
  const isWrite = method !== 'GET' && method !== 'HEAD';
  // Route paths are registered with and without the /api/v1 mount prefix.
  const p = path.startsWith('/api/v1/') ? path.slice('/api/v1'.length) : path;
  if (p.startsWith('/webhooks/')) return 'webhook';
  if (p.startsWith('/admin')) return isWrite ? 'admin_write' : 'public_get';
  if (p.startsWith('/ai')) return 'ai_stream';
  if (p.startsWith('/certificates')) return isWrite ? 'certificate_upload' : 'public_get';
  if (p.startsWith('/checkout')) return 'checkout';
  if (
    (p.startsWith('/carts') && isWrite) ||
    (p.startsWith('/favorites') && isWrite) ||
    (p.startsWith('/dyo') && isWrite)
  ) {
    return 'cart_mutation';
  }
  if (p.startsWith('/search')) return 'search';
  return 'public_get';
}

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
