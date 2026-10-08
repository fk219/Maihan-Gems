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
import { createRateLimiter, type RateLimiterDeps } from './limiter.js';

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
