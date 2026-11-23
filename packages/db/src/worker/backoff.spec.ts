/**
 * packages/db/src/worker/backoff.spec.ts
 *
 * Backoff must grow, must stop growing at the cap, and must be reproducible
 * when the random source is pinned (technical_design/27 §12 "Backoff").
 */
import { describe, expect, it } from 'vitest';

import { computeBackoffMs, DEFAULT_BACKOFF } from './backoff.js';

const noJitter = () => 0.5;

describe('computeBackoffMs', () => {
  it('doubles per attempt', () => {
    expect(computeBackoffMs(1, DEFAULT_BACKOFF, noJitter)).toBe(1_000);
    expect(computeBackoffMs(2, DEFAULT_BACKOFF, noJitter)).toBe(2_000);
    expect(computeBackoffMs(3, DEFAULT_BACKOFF, noJitter)).toBe(4_000);
    expect(computeBackoffMs(4, DEFAULT_BACKOFF, noJitter)).toBe(8_000);
  });

  it('never exceeds the cap, however many attempts have failed', () => {
    expect(computeBackoffMs(50, DEFAULT_BACKOFF, noJitter)).toBe(DEFAULT_BACKOFF.maxMs);
    expect(computeBackoffMs(50, DEFAULT_BACKOFF, () => 1)).toBeLessThanOrEqual(
      DEFAULT_BACKOFF.maxMs,
    );
  });

  it('jitters within the configured band and never negative', () => {
    const low = computeBackoffMs(3, DEFAULT_BACKOFF, () => 0);
    const high = computeBackoffMs(3, DEFAULT_BACKOFF, () => 1);
    expect(low).toBe(3_200);
    expect(high).toBe(4_800);
    expect(low).toBeGreaterThan(0);
  });

  it('treats a nonsense attempt as the first retry', () => {
    expect(computeBackoffMs(0, DEFAULT_BACKOFF, noJitter)).toBe(1_000);
    expect(computeBackoffMs(Number.NaN, DEFAULT_BACKOFF, noJitter)).toBe(1_000);
  });

  it('is deterministic for a pinned random source', () => {
    expect(computeBackoffMs(5, DEFAULT_BACKOFF, () => 0.37)).toBe(
      computeBackoffMs(5, DEFAULT_BACKOFF, () => 0.37),
    );
  });
});
