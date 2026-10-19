/**
 * apps/web/src/api/ratelimit/gate.ts
 *
 * Task 9 — the REQUEST-BOUNDARY gate: the shape `createCatalogApi` calls,
 * and the factory that builds it from a limiter.
 *
 * Why a decision and not a Response: the gate must attach RateLimit-*
 * headers to ALLOWED responses too (the draft headers describe the budget
 * that was just spent), and a `Response | null` hook cannot carry headers on
 * the null path. So the gate answers "allowed + headers", and the API layer
 * turns a rejection into the SoT 10.4 `RATE_LIMITED` envelope — the envelope
 * is built in exactly one place (envelope.ts), never twice.
 *
 * Placement: the gate runs AFTER route lookup (only catalogue routes are
 * rate limited; unknown paths are 404 without consuming budget) and BEFORE
 * the handler — at the request boundary, never inside a repository, query or
 * domain object (plan task 9).
 */
import type { CatalogDatabase } from '@maihan/db';
import type { Redis } from 'ioredis';
import { createRateLimiter, createBackendChain, type RateLimiterDeps } from './limiter.js';
import {
  RATE_LIMIT_POLICIES,
  SCOPE_FAILURE_MODES,
  scopeForRoute,
  type RateLimitPolicy,
  type RateLimitScope,
} from './policy.js';

/** What the gate answers for every request, allowed or not. */
export interface RateLimitDecision {
  readonly allowed: boolean;
  /** RateLimit-* headers, plus Retry-After when rejected. Attach to the response. */
  readonly headers: Record<string, string>;
  /** Which backend counted: 'primary' (Redis), 'fallback' (Postgres), 'degraded'. */
  readonly backend: 'primary' | 'fallback' | 'degraded';
}

/**
 * The request-boundary hook. `route` is passed so a later phase can scope
 * limits per endpoint group (SoT 11.11 has per-scope policies); every
 * Phase 3 route is a catalogue public GET, answered by the `public_get`
 * policy.
 */
export type RateLimitGate = (
  request: Request,
  route: { id: string; path: string },
) => Promise<RateLimitDecision>;

/** Build the gate from limiter dependencies (policy, backends, failure mode). */
export function createRateLimitGate(deps: RateLimiterDeps): RateLimitGate {
  const check = createRateLimiter(deps);
  return async function gate(request: Request): Promise<RateLimitDecision> {
    const outcome = await check(request);
    return { allowed: outcome.allowed, headers: outcome.headers, backend: outcome.backend };
  };
}

export interface ScopedRateLimitGateOptions {
  readonly redis?: Redis | null;
  readonly db?: CatalogDatabase | null;
  /** Observability hook; never a secret, never the raw identity. */
  readonly onDegradation?: (event: { stage: string; bucket: string; error: unknown }) => void;
}

/**
 * The FULL SoT 11.11 gate (M-09): one limiter per scope, lazily built, each
 * with its own backend chain (the Redis TTL and the bucket key are scoped).
 * Scopes carrying a SoT `dailyLimit` (ai_stream: 200/day) get a SECOND,
 * day-aligned limiter on its own backend chain; the request is allowed only
 * when BOTH windows allow. Scope resolution is `scopeForRoute` —
 * deterministic, in code, at the request boundary; no handler participates.
 */
export function createScopedRateLimitGate(options: ScopedRateLimitGateOptions): RateLimitGate {
  const limiters = new Map<RateLimitScope, ReturnType<typeof createRateLimiter>>();
  const dayLimiters = new Map<RateLimitScope, ReturnType<typeof createRateLimiter>>();

  const buildLimiter = (policy: RateLimitPolicy): ReturnType<typeof createRateLimiter> =>
    createRateLimiter({
      policy,
      backends: createBackendChain({ redis: options.redis ?? null, db: options.db ?? null, policy }),
      failureMode: SCOPE_FAILURE_MODES[policy.scope],
      onDegradation: options.onDegradation,
    });

  const limiterFor = (scope: RateLimitScope): ReturnType<typeof createRateLimiter> => {
    let limiter = limiters.get(scope);
    if (!limiter) {
      limiter = buildLimiter(RATE_LIMIT_POLICIES[scope]);
      limiters.set(scope, limiter);
    }
    return limiter;
  };

  const dayLimiterFor = (scope: RateLimitScope): ReturnType<typeof createRateLimiter> | null => {
    const policy = RATE_LIMIT_POLICIES[scope];
    if (policy.dailyLimit === undefined) return null;
    let dayLimiter = dayLimiters.get(scope);
    if (!dayLimiter) {
      dayLimiter = buildLimiter({
        scope,
        limit: policy.dailyLimit,
        windowSeconds: 86400, // day-aligned fixed window
      });
      dayLimiters.set(scope, dayLimiter);
    }
    return dayLimiter;
  };

  return async function scopedGate(request: Request, route: { id: string; path: string }): Promise<RateLimitDecision> {
    const method = request.method.toUpperCase();
    const scope = scopeForRoute(route.id, route.path, method);
    const minute = await limiterFor(scope)(request);
    const dayLimiter = dayLimiterFor(scope);
    if (dayLimiter === null || !minute.allowed) {
      return { allowed: minute.allowed, headers: minute.headers, backend: minute.backend };
    }
    const day = await dayLimiter(request);
    return {
      allowed: day.allowed,
      headers: { ...minute.headers, ...day.headers, 'RateLimit-Limit': minute.headers['RateLimit-Limit'] ?? String(RATE_LIMIT_POLICIES[scope].limit) },
      backend: day.backend === 'degraded' ? minute.backend : day.backend,
    };
  };
}
