/**
 * packages/db/src/media/backfill.spec.ts — A4 properties.
 *
 * Two layers, both without a database:
 *   - the pure planner, one test per reason code plus precedence, budget and
 *     the no-row-lost invariant;
 *   - the runner against an in-memory store and storage, proving that a
 *     second run is a no-op and that failure counting reaches RETRY_LIMIT.
 */
import { describe, expect, it } from 'vitest';
import {
  BackfillPlanError,
  isChildChrome,
  planAssetBackfill,
  readAttemptCount,
  runAssetBackfill,
  type AssetFetcher,
  type BackfillAssetRow,
  type BackfillSkipReason,
  type BackfillStore,
  type ReadyAssetInput,
} from './backfill.js';
import type { ObjectStorage, PutObjectInput, StoredObject } from './storage.js';

function row(overrides: Partial<BackfillAssetRow> = {}): BackfillAssetRow {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    sourceUrl: 'https://cdn.example.com/stone/k1000/image/a.jpg',
    kind: 'IMAGE',
    role: 'PRIMARY',
    sourcePathStem: 'stone/k1000/image',
    mimeType: 'image/jpeg',
    processingState: 'PENDING',
    processingError: null,
    ...overrides,
  };
}

describe('planAssetBackfill — one test per reason code', () => {
  it('FETCHes a normal public image', () => {
    const plan = planAssetBackfill([row()]);
    expect(plan.decisions).toEqual([
      {
        assetId: '00000000-0000-4000-8000-000000000001',
        action: 'FETCH',
        sourceUrl: 'https://cdn.example.com/stone/k1000/image/a.jpg',
      },
    ]);
    expect(plan.counts.FETCH).toBe(1);
    expect(plan.deferred).toEqual([]);
  });

  it('SKIPs NO_URL when the source is missing, blank or not http(s)', () => {
    const plan = planAssetBackfill([
      row({ id: 'a', sourceUrl: null }),
      row({ id: 'b', sourceUrl: '   ' }),
      row({ id: 'c', sourceUrl: 'data:image/png;base64,AAAA' }),
      row({ id: 'd', sourceUrl: 'not a url' }),
    ]);
    expect(plan.decisions.map((d) => d.reason)).toEqual(Array(4).fill('NO_URL'));
    expect(plan.counts.NO_URL).toBe(4);
  });

  it('SKIPs UNSUPPORTED_TYPE for a kind or MIME the pipeline cannot validate', () => {
    const plan = planAssetBackfill([
      row({ id: 'video', kind: 'VIDEO_360' }),
      row({ id: 'pdf', kind: 'CERTIFICATE', role: 'CERTIFICATE', mimeType: 'application/pdf' }),
      row({ id: 'gif', mimeType: 'image/gif' }),
      row({ id: 'js-mime', mimeType: 'application/javascript' }),
    ]);
    expect(plan.counts.UNSUPPORTED_TYPE).toBe(4);
  });

  it('SKIPs CHILD_CHROME for navigation, layout, filters and JavaScript', () => {
    expect(
      isChildChrome('https://x.example.com/images/normal/mainMenu/icon.png', 'images/normal/mainMenu'),
    ).toBe(true);
    expect(
      isChildChrome('https://x.example.com/images/normal/filters/red.png', 'images/normal/filters'),
    ).toBe(true);
    expect(isChildChrome('https://x.example.com/_nuxt/app.123.js', 'asset')).toBe(true);
    expect(isChildChrome('https://x.example.com/images/normal/packaging/box.png', 'images/normal/packaging')).toBe(
      false,
    );

    const plan = planAssetBackfill([
      row({
        id: 'chrome',
        sourceUrl: 'https://x.example.com/images/normal/mainMenu/icon.png',
        sourcePathStem: 'images/normal/mainMenu',
      }),
    ]);
    expect(plan.decisions[0]?.reason).toBe('CHILD_CHROME');
  });

  it('SKIPs ALREADY_READY without rewriting a terminal row', () => {
    const plan = planAssetBackfill([
      row({ id: 'ready', processingState: 'READY' }),
      row({ id: 'skipped', processingState: 'SKIPPED', processingError: 'CHILD_CHROME' }),
    ]);
    expect(plan.decisions).toEqual([
      { assetId: 'ready', action: 'SKIP', reason: 'ALREADY_READY' },
      { assetId: 'skipped', action: 'SKIP', reason: 'ALREADY_READY' },
    ]);
    expect(plan.counts.ALREADY_READY).toBe(2);
  });

  it('SKIPs RETRY_LIMIT once failures reach the limit', () => {
    const plan = planAssetBackfill(
      [
        row({ id: 'failed-2', processingState: 'FAILED', processingError: 'attempt=2; FETCH_FAILED' }),
        row({ id: 'failed-3', processingState: 'FAILED', processingError: 'attempt=3; FETCH_FAILED' }),
      ],
      { retryLimit: 3 },
    );
    expect(plan.decisions).toEqual([
      { assetId: 'failed-2', action: 'FETCH', sourceUrl: 'https://cdn.example.com/stone/k1000/image/a.jpg' },
      { assetId: 'failed-3', action: 'SKIP', reason: 'RETRY_LIMIT' },
    ]);
    expect(plan.counts.RETRY_LIMIT).toBe(1);
  });
});

describe('planAssetBackfill — precedence, budget, idempotency', () => {
  it('keeps the documented precedence: terminal, then URL, chrome, type, retry', () => {
    const plan = planAssetBackfill([
      row({ id: 'ready-no-url', processingState: 'READY', sourceUrl: null }),
      row({
        id: 'chrome-video',
        kind: 'VIDEO_360',
        sourceUrl: 'https://x.example.com/_nuxt/app.js',
      }),
    ]);
    expect(plan.decisions.map((d) => d.reason)).toEqual(['ALREADY_READY', 'CHILD_CHROME']);
  });

  it('defers fetchable rows beyond the budget instead of mislabelling them SKIPPED', () => {
    const rows = [row({ id: 'a' }), row({ id: 'b' }), row({ id: 'c' })];
    const plan = planAssetBackfill(rows, { limit: 2 });

    expect(plan.decisions.map((d) => [d.assetId, d.action])).toEqual([
      ['a', 'FETCH'],
      ['b', 'FETCH'],
    ]);
    expect(plan.deferred).toEqual(['c']);
    expect(plan.counts.FETCH).toBe(2);

    // Zero budget still classifies skips; it only defers real work.
    const zero = planAssetBackfill([...rows, row({ id: 'skip', sourceUrl: null })], { limit: 0 });
    expect(zero.decisions).toEqual([{ assetId: 'skip', action: 'SKIP', reason: 'NO_URL' }]);
    expect(zero.deferred).toEqual(['a', 'b', 'c']);
  });

  it('accounts for every input row exactly once', () => {
    const rows = [
      row({ id: 'one' }),
      row({ id: 'two', sourceUrl: null }),
      row({ id: 'three' }),
      row({ id: 'four', processingState: 'READY' }),
    ];
    const plan = planAssetBackfill(rows, { limit: 1 });
    const seen = [...plan.decisions.map((d) => d.assetId), ...plan.deferred];
    expect(seen.sort()).toEqual(['four', 'one', 'three', 'two']);
    expect(new Set(seen).size).toBe(rows.length);
  });

  it('is deterministic for the same input', () => {
    const rows = [row({ id: 'a' }), row({ id: 'b', sourceUrl: null })];
    expect(planAssetBackfill(rows, { limit: 1 })).toEqual(planAssetBackfill(rows, { limit: 1 }));
  });

  it('reads attempts from the explicit field first, then from processing_error', () => {
    expect(readAttemptCount(row({ attempts: 2, processingError: 'attempt=9' }))).toBe(2);
    expect(readAttemptCount(row({ processingError: 'attempt=4; FETCH_FAILED' }))).toBe(4);
    expect(readAttemptCount(row({ processingError: 'nonsense' }))).toBe(0);
    expect(readAttemptCount(row({ attempts: -1 }))).toBe(0);
  });

  it('rejects an invalid budget instead of silently ignoring it', () => {
    expect(() => planAssetBackfill([], { limit: -1 })).toThrow(BackfillPlanError);
    expect(() => planAssetBackfill([], { limit: 1.5 })).toThrow(BackfillPlanError);
    expect(() => planAssetBackfill([], { retryLimit: 0 })).toThrow(BackfillPlanError);
  });
});

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

interface MemoryRow {
  row: BackfillAssetRow;
  state: string;
  error: string | null;
  storageKey: string | null;
}

class MemoryStore implements BackfillStore {
  readonly rows = new Map<string, MemoryRow>();

  constructor(rows: readonly BackfillAssetRow[]) {
    for (const item of rows) {
      this.rows.set(item.id, { row: item, state: item.processingState, error: item.processingError ?? null, storageKey: null });
    }
  }

  async listCandidates(limit: number) {
    return [...this.rows.values()]
      .filter((entry) => !['READY', 'SKIPPED'].includes(entry.state))
      .slice(0, limit)
      .map((entry) => ({ ...entry.row, processingState: entry.state, processingError: entry.error }));
  }

  async markFetching(assetId: string, attempt: number) {
    const entry = this.rows.get(assetId);
    if (entry !== undefined) {
      entry.state = 'FETCHING';
      entry.error = `attempt=${attempt}`;
    }
  }

  async markReady(assetId: string, stored: ReadyAssetInput) {
    const entry = this.rows.get(assetId);
    if (entry !== undefined) {
      entry.state = 'READY';
      entry.storageKey = stored.storageKey;
      entry.error = null;
    }
  }

  async markSkipped(assetId: string, reason: BackfillSkipReason) {
    const entry = this.rows.get(assetId);
    if (entry !== undefined) {
      entry.state = 'SKIPPED';
      entry.error = reason;
    }
  }

  async markFailed(assetId: string, failure: string) {
    const entry = this.rows.get(assetId);
    if (entry !== undefined) {
      entry.state = 'FAILED';
      entry.error = failure;
    }
  }

  async countByState() {
    const counts: Record<string, number> = {};
    for (const entry of this.rows.values()) {
      counts[entry.state] = (counts[entry.state] ?? 0) + 1;
    }
    return counts;
  }
}

function memoryStorage(): ObjectStorage & { objects: Map<string, Uint8Array> } {
  const objects = new Map<string, Uint8Array>();
  return {
    objects,
    async put(input: PutObjectInput): Promise<StoredObject> {
      objects.set(input.key, input.body);
      return {
        key: input.key,
        size: input.body.byteLength,
        contentType: input.contentType,
        sha256: 'f'.repeat(64),
      };
    },
    async get(key: string) {
      return objects.get(key) ?? null;
    },
    async head(key: string) {
      const body = objects.get(key);
      return body === undefined
        ? null
        : { key, size: body.byteLength, contentType: 'image/png', sha256: 'f'.repeat(64) };
    },
    async delete(key: string) {
      objects.delete(key);
    },
    publicUrl(key: string) {
      return `/media/${key}`;
    },
  };
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function countingFetcher(result: () => Promise<{ bytes: Uint8Array; contentType: string }>): AssetFetcher & { calls: number } {
  const fetcher = (async () => {
    fetcher.calls += 1;
    return result();
  }) as unknown as AssetFetcher & { calls: number };
  fetcher.calls = 0;
  return fetcher;
}

describe('runAssetBackfill', () => {
  it('marks READY, SKIPPED and FAILED explicitly and reports a full census', async () => {
    const store = new MemoryStore([
      row({ id: 'fetch-me' }),
      row({ id: 'chrome', sourceUrl: 'https://x.example.com/_nuxt/app.js' }),
      row({ id: 'ready', processingState: 'READY' }),
    ]);
    const fetcher = countingFetcher(async () => ({ bytes: PNG, contentType: 'image/png' }));

    const report = await runAssetBackfill(
      { store, storage: memoryStorage(), fetchBytes: fetcher },
      { provider: 'local', limit: 10 },
    );

    expect(report.fetched).toBe(1);
    expect(report.ready).toBe(1);
    // Terminal rows are not candidates; the census below still accounts for them.
    expect(report.skipped).toBe(1);
    expect(report.failed).toBe(0);
    expect(report.stateCounts).toEqual({ READY: 2, SKIPPED: 1 });
    expect(store.rows.get('fetch-me')?.storageKey).toMatch(/^[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{64}\.png$/);
  });

  it('is safe to run twice: a second run fetches nothing and changes nothing', async () => {
    const store = new MemoryStore([row({ id: 'fetch-me' })]);
    const storage = memoryStorage();
    const fetcher = countingFetcher(async () => ({ bytes: PNG, contentType: 'image/png' }));

    const first = await runAssetBackfill(
      { store, storage, fetchBytes: fetcher },
      { provider: 'local', limit: 10 },
    );
    const second = await runAssetBackfill(
      { store, storage, fetchBytes: fetcher },
      { provider: 'local', limit: 10 },
    );

    expect(first.ready).toBe(1);
    expect(second.fetched).toBe(0);
    expect(second.ready).toBe(0);
    expect(fetcher.calls).toBe(1);
    expect(second.stateCounts).toEqual({ READY: 1 });
  });

  it('counts failures and becomes terminal RETRY_LIMIT on the third', async () => {
    const store = new MemoryStore([row({ id: 'flaky' })]);
    const storage = memoryStorage();
    const fetcher = countingFetcher(async () => {
      throw new Error('network down');
    });

    const first = await runAssetBackfill(
      { store, storage, fetchBytes: fetcher },
      { provider: 'local', limit: 10, retryLimit: 3 },
    );
    const second = await runAssetBackfill(
      { store, storage, fetchBytes: fetcher },
      { provider: 'local', limit: 10, retryLimit: 3 },
    );
    const third = await runAssetBackfill(
      { store, storage, fetchBytes: fetcher },
      { provider: 'local', limit: 10, retryLimit: 3 },
    );

    expect(first.items[0]).toMatchObject({ outcome: 'FAILED', reason: 'FETCH_FAILED' });
    expect(second.items[0]).toMatchObject({ outcome: 'FAILED' });
    expect(third.items[0]).toMatchObject({ outcome: 'SKIPPED', reason: 'RETRY_LIMIT' });
    expect(store.rows.get('flaky')?.error).toBe('RETRY_LIMIT');
    expect(fetcher.calls).toBe(3);

    // Fourth run: the terminal row is not even a candidate.
    const fourth = await runAssetBackfill(
      { store, storage, fetchBytes: fetcher },
      { provider: 'local', limit: 10, retryLimit: 3 },
    );
    expect(fourth.fetched).toBe(0);
    expect(fetcher.calls).toBe(3);
  });

  it('records a policy rejection as the reason, not as a crash', async () => {
    const store = new MemoryStore([row({ id: 'html-error-page' })]);
    const fetcher = countingFetcher(async () => ({
      bytes: new TextEncoder().encode('<html>not an image</html>'),
      contentType: 'image/png',
    }));

    const report = await runAssetBackfill(
      { store, storage: memoryStorage(), fetchBytes: fetcher },
      { provider: 'local', limit: 10 },
    );

    expect(report.failed).toBe(1);
    expect(store.rows.get('html-error-page')?.error).toBe('attempt=1; TYPE_MISMATCH');
  });
});
