/**
 * packages/db/src/worker/backoff.ts
 *
 * Exponential backoff with jitter, shared by the outbox dispatcher and the job
 * runner (technical_design/27 §2, §8: "exponential with jitter, capped").
 *
 * The jitter is symmetric and proportional. It exists so that N workers that
 * failed at the same instant do not retry at the same instant; a fixed delay
 * turns a transient provider outage into a thundering herd.
 *
 * `random` is injected so tests can pin the delay exactly. Runtime callers use
 * Math.random, which is not a security boundary — nothing here is a secret.
 */

export const DEFAULT_MAX_ATTEMPTS = 5;

export interface BackoffPolicy {
  /** Delay before the second attempt, in milliseconds. */
  readonly baseMs: number;
  /** Hard ceiling; the cap is what stops a 2^n blow-up. */
  readonly maxMs: number;
  /** Fraction of the delay that may be added or removed, 0..1. */
  readonly jitterRatio: number;
}

export const DEFAULT_BACKOFF: BackoffPolicy = Object.freeze({
  baseMs: 1_000,
  maxMs: 300_000,
  jitterRatio: 0.2,
});

/**
 * Delay before attempt number `attempt` (1 = the first retry, after one
 * failure). Always a finite integer >= 0.
 */
export function computeBackoffMs(
  attempt: number,
  policy: BackoffPolicy = DEFAULT_BACKOFF,
  random: () => number = Math.random,
): number {
  const safeAttempt = Number.isFinite(attempt) && attempt >= 1 ? Math.floor(attempt) : 1;
  const exponential = policy.baseMs * 2 ** (safeAttempt - 1);
  const capped = Math.min(exponential, policy.maxMs);
  const jitter = capped * policy.jitterRatio * (random() * 2 - 1);
  return Math.max(0, Math.min(policy.maxMs, Math.round(capped + jitter)));
}
