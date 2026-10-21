import { describe, expect, it, vi } from 'vitest';
import { MemoryGenerationStore } from './cache-store.js';
import { createFeatureFlagGenerationStore } from './feature-flag-generation-store.js';

describe('FeatureFlagGenerationStore (worker bump read-through)', () => {
  it('returns the base generation when the flag has never been written', async () => {
    const base = new MemoryGenerationStore();
    await base.bump('search' as never);
    const store = createFeatureFlagGenerationStore({
      base,
      readFlagGeneration: async () => null,
    });
    expect(Number(await store.get('search' as never))).toBe(1);
    expect(Number(await store.get('products' as never))).toBe(0);
  });

  it('lifts the worker flag as a floor over the per-process generation', async () => {
    const base = new MemoryGenerationStore();
    let flag = 7;
    const store = createFeatureFlagGenerationStore({
      base,
      readFlagGeneration: async () => flag,
      pollSeconds: 60,
    });
    await store.refreshFlag();
    // The worker-side generation outranks the local counter.
    expect(Number(await store.get('search' as never))).toBe(7);
    // A local bump below the floor cannot resurrect old keys.
    await base.bump('search' as never);
    expect(Number(await store.get('search' as never))).toBe(7);
    // Explicit refresh honours a new (higher) flag generation…
    flag = 20;
    await store.refreshFlag();
    expect(Number(await store.get('search' as never))).toBe(20);
    // …and a local base counter higher than the floor wins (bump can also
    // originate from this process).
    flag = 2;
    await store.refreshFlag();
    await base.bump('search' as never);
    await base.bump('search' as never);
    expect(Number(await store.get('search' as never))).toBe(3); // base=3 > floor 2
  });

  it('degrades to the base store when the flag read fails and retries after the poll window', async () => {
    const base = new MemoryGenerationStore();
    let failing = true;
    const readFlagGeneration = vi.fn(async () => {
      if (failing) throw new Error('db down');
      return 4;
    });
    const store = createFeatureFlagGenerationStore({ base, readFlagGeneration, pollSeconds: 1 });
    expect(Number(await store.get('search' as never))).toBe(0);
    failing = false;
    // The failed probe is cached (failure backoff) for the poll window…
    expect(Number(await store.get('search' as never))).toBe(0);
    // …and an explicit refresh retries immediately.
    await store.refreshFlag();
    expect(Number(await store.get('search' as never))).toBe(4);
    expect(readFlagGeneration.mock.calls.length).toBe(2);
  });
});
