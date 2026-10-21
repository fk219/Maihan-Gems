/**
 * apps/web/src/api/ratelimit/limiter.ts
 *
 * Task 9 — the rate limiter at the REQUEST boundary.
 *
 * Flow (plan task 9 / SoT 11.11):
 *
 *   REQUEST -> identify bucket (per IP, hashed) -> check window count
 *          -> ALLOW (RateLimit-* headers) or REJECT (429 RATE_LIMITED,
 *             RateLimit-* + Retry-After, SoT 10.4 error envelope)
 *
 * Backend chain: Redis first (SoT 15.1 row 15 `rl:{bucket}:{window}`), then
 * the Postgres `rate_limit_counters` fallback (SoT 11.11 verbatim) — tried
 * IN ORDER on every request, so Redis recovering is automatic.
 *
 * If EVERY backend fails: the SoT gives `RATE_LIMIT_BACKEND_DOWN` (429,
 * "fail closed on abuse paths", doc 25 §8) and doc 37 says fail closed on
 * *abuse-sensitive* endpoints — public catalogue reads are not one. So the
 * default for `public_get` is `failureMode: 'allow'` (availability over
 * precision — doc 06 failure modes: "Redis down -> Rate limits fall back;
 * reads continue; 429 less precise"), with `reject` available for the abuse
 * scopes of later phases. Both branches are tested; neither is silent.
 *
 * Placement: this runs BEFORE the handler and never inside a repository,
 * query or domain object (plan task 9 requirement) — the limiter only sees
 * the request, never the catalogue.
 */
import type { CatalogDatabase } from '@maihan/db';
import type { Redis } from 'ioredis';
import {
  RATE_LIMIT_POLICIES,
  bucketKey,
  secondsUntilWindowEnd,
  windowStartSeconds,
  type RateLimitPolicy,
  type RateLimitScope,
} from './policy.js';
import { MemoryRateLimitStore, PostgresRateLimitStore, RedisRateLimitStore, type RateLimitStore } from './stores.js';

/** Ordered backend chain: primary (Redis) then fallback (Postgres). */
export interface RateLimitBackendChain {
  readonly primary: RateLimitStore;
  readonly fallback: RateLimitStore;
}

export type BackendFailureMode = 'allow' | 'reject';

export interface DegradationEvent {
  stage: 'primary' | 'fallback';
  bucket: string;
  error: unknown;
}

export interface RateLimiterDeps {
  policy: RateLimitPolicy;
  backends: RateLimitBackendChain;
  /** What to do when EVERY backend fails (public reads: 'allow'). */
  failureMode: BackendFailureMode;
  /** Injectable clock for deterministic window tests. */
  now?: () => number;
  /** Identity resolver (default: x-client-ip, then XFF first hop). */
  identify?: (request: Request) => string;
  /** Observability hook; never a secret, never the raw identity. */
  onDegradation?: (event: DegradationEvent) => void;
}

export interface RateLimitOutcome {
  allowed: boolean;
  /** Headers to attach to WHATEVER response follows (allowed or rejected). */
  headers: Record<string, string>;
  /** 'primary' (Redis), 'fallback' (Postgres), 'degraded' (both failed). */
  backend: 'primary' | 'fallback' | 'degraded';
}

export type RequestRateLimiter = (request: Request) => Promise<RateLimitOutcome>;

/**
 * Client identity for bucketing. `x-client-ip` is set by OUR node adapter
 * from the socket (a client cannot spoof it on a direct connection).
 * P1-20 identity hardening:
 *   - If OUR adapter did NOT set `x-client-ip`, a client-supplied
 *     `x-forwarded-for` would otherwise choose the bucket; that is only
 *     honoured when the deployment explicitly opted in via
 *     `MAIHAN_TRUST_FORWARDED_IP=1` (documented proxy deployments). A second
 *     `x-client-ip` must come from the trusted adaptation layer: a
 *     client-supplied header never overrides the adapter value
 *     (the adapter overwrites it last, and in the in-process Next path,
 *     where no adapter runs, the header is treated UNTRUSTED).
 *   - Otherwise every unproxied caller may share one 'shared-unknown'
 *     bucket — conservative (favours stricter limiting) rather than a
 *     spoofable per-client choice.
 */
export function defaultIdentify(request: Request): string {
  const clientIp = request.headers.get('x-client-ip');
  if (clientIp !== null && clientIp !== '') {
    // Trusted only when marked authoritative by our own adapter; the adapter
    // sets this marker header.
    const trusted = request.headers.get('x-maihan-ip-source') === 'adapter';
    if (trusted) return clientIp;
  }
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded !== null && forwarded !== '' && process.env['MAIHAN_TRUST_FORWARDED_IP'] === '1') {
    const first = forwarded.split(',')[0];
    if (first !== undefined && first.trim() !== '') return first.trim();
  }
  return 'shared-unknown';
}

const rateLimitHeaders = (
  policy: RateLimitPolicy,
  remaining: number | null,
  resetSeconds: number | null,
): Record<string, string> => {
  const headers: Record<string, string> = { 'RateLimit-Limit': String(policy.limit) };
  if (remaining !== null) headers['RateLimit-Remaining'] = String(Math.max(0, remaining));
  if (resetSeconds !== null) headers['RateLimit-Reset'] = String(resetSeconds);
  return headers;
};

export function createRateLimiter(deps: RateLimiterDeps): RequestRateLimiter {
  const now = deps.now ?? Date.now;
  const identify = deps.identify ?? defaultIdentify;
  const policy = deps.policy;

  return async function check(request: Request): Promise<RateLimitOutcome> {
    const nowMs = now();
    const windowStart = windowStartSeconds(nowMs, policy.windowSeconds);
    const bucket = bucketKey(policy, identify(request), windowStart);
    const resetSeconds = secondsUntilWindowEnd(nowMs, policy.windowSeconds);

    let count: number | null = null;
    let backend: RateLimitOutcome['backend'] = 'degraded';

    try {
      count = await deps.backends.primary.increment(bucket, windowStart);
      backend = 'primary';
    } catch (error) {
      deps.onDegradation?.({ stage: 'primary', bucket, error });
      try {
        count = await deps.backends.fallback.increment(bucket, windowStart);
        backend = 'fallback';
      } catch (fallbackError) {
        deps.onDegradation?.({ stage: 'fallback', bucket, error: fallbackError });
      }
    }

    if (count === null) {
      // Every backend failed. Documented behaviour per policy.failureMode.
      const allowed = deps.failureMode === 'allow';
      const headers = rateLimitHeaders(policy, null, resetSeconds);
      if (!allowed) headers['Retry-After'] = String(resetSeconds);
      return { allowed, headers, backend: 'degraded' };
    }

    const allowed = count <= policy.limit;
    const headers = rateLimitHeaders(policy, policy.limit - count, resetSeconds);
    if (!allowed) headers['Retry-After'] = String(resetSeconds);
    return { allowed, headers, backend };
  };
}

/** Build the standard backend chain from infrastructure handles. */
export function createBackendChain(options: {
  redis?: Redis | null;
  db?: CatalogDatabase | null;
  policy: RateLimitPolicy;
}): RateLimitBackendChain {
  const primary: RateLimitStore =
    options.redis === undefined || options.redis === null
      ? new MemoryRateLimitStore() // no Redis configured: in-process window counters
      : new RedisRateLimitStore(options.redis, options.policy.windowSeconds);
  const fallback: RateLimitStore =
    options.db === undefined || options.db === null
      ? new MemoryRateLimitStore()
      : new PostgresRateLimitStore(options.db);
  return { primary, fallback };
}

export { RATE_LIMIT_POLICIES };
export type { RateLimitScope, RateLimitPolicy };
