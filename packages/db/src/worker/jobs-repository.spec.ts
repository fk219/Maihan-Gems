/**
 * packages/db/src/worker/jobs-repository.spec.ts
 *
 * No database. The suite pins the queue's contract:
 *   - enqueue is idempotent on `job_key` and returns the ORIGINAL job;
 *   - claim is `FOR UPDATE SKIP LOCKED` + lease, with queues bound as an array;
 *   - complete/fail require the caller to still own the lease;
 *   - exhaustion dead-letters at the row's own `max_attempts`.
 */
import { describe, expect, it } from 'vitest';

import { createScriptedExecutor } from '../test/sql-capture.js';
import {
  claimJobs,
  completeJob,
  enqueueJob,
  failJob,
  findJobByKey,
  hasSucceededJob,
} from './jobs-repository.js';

function job(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    job_key: 'email.order_confirmation:22222222-2222-4222-8222-222222222222',
    queue: 'default',
    job_type: 'EMAIL_SEND',
    payload: { kind: 'order_confirmation' },
    state: 'QUEUED',
    priority: 100,
    attempts: 0,
    max_attempts: 5,
    locked_by: null,
    locked_until: null,
    run_after: '2026-11-23T10:00:00.000Z',
    last_error: null,
    result: null,
    started_at: null,
    finished_at: null,
    created_at: '2026-11-23T10:00:00.000Z',
    updated_at: '2026-11-23T10:00:00.000Z',
    ...overrides,
  };
}

describe('enqueueJob', () => {
  it('inserts with a bound payload and reports inserted: true', async () => {
    const db = createScriptedExecutor([[job()]]);
    const result = await enqueueJob(db as never, {
      jobKey: 'email.order_confirmation:22222222-2222-4222-8222-222222222222',
      queue: 'default',
      jobType: 'EMAIL_SEND',
      payload: { kind: 'order_confirmation', orderId: '22222222-2222-4222-8222-222222222222' },
    });

    expect(result.inserted).toBe(true);
    const query = db.queries[0];
    expect(query?.text).toContain('ON CONFLICT (job_key) DO NOTHING');
    expect(query?.text).toContain('COALESCE($7::timestamptz, now())');
    expect(query?.values[0]).toBe('email.order_confirmation:22222222-2222-4222-8222-222222222222');
    expect(query?.values[1]).toBe('default');
    expect(query?.values[2]).toBe('EMAIL_SEND');
    expect(typeof query?.values[3]).toBe('string');
    expect(query?.text).not.toContain('order_confirmation');
  });

  it('returns the ORIGINAL job when the key already exists', async () => {
    const existing = job({ state: 'RUNNING', attempts: 1 });
    const db = createScriptedExecutor([[], [existing]]);
    const result = await enqueueJob(db as never, {
      jobKey: 'email.order_confirmation:22222222-2222-4222-8222-222222222222',
      queue: 'default',
      jobType: 'EMAIL_SEND',
      payload: { ignored: true },
    });

    expect(result.inserted).toBe(false);
    expect(result.job.state).toBe('RUNNING');
    expect(db.queries[1]?.text).toContain('WHERE job_key = $1');
  });

  it('always inserts when there is no idempotency key', async () => {
    const db = createScriptedExecutor([[job({ job_key: null })]]);
    const result = await enqueueJob(db as never, {
      queue: 'maintenance',
      jobType: 'inventory.release_expired',
    });
    expect(result.inserted).toBe(true);
    expect(db.queries[0]?.values[0]).toBeNull();
  });

  it('rejects a non-object payload before touching the database', async () => {
    const db = createScriptedExecutor([]);
    await expect(
      enqueueJob(db as never, {
        queue: 'default',
        jobType: 'EMAIL_SEND',
        payload: [] as unknown as Record<string, unknown>,
      }),
    ).rejects.toThrow(/payload must be a JSON object/);
    expect(db.queries).toHaveLength(0);
  });

  it('clamps a non-positive max_attempts to the default', async () => {
    const db = createScriptedExecutor([[job()]]);
    await enqueueJob(db as never, {
      queue: 'default',
      jobType: 'EMAIL_SEND',
      maxAttempts: 0,
    });
    expect(db.queries[0]?.values[5]).toBe(5);
  });
});

describe('claimJobs', () => {
  it('claims with SKIP LOCKED, an array-bound queue list and a lease', async () => {
    const db = createScriptedExecutor([[job({ state: 'RUNNING', attempts: 1 })]]);
    const claimed = await claimJobs(db as never, {
      workerId: 'worker-a',
      queues: ['default', 'critical'],
      limit: 5,
      leaseMs: 15_000,
    });

    expect(claimed).toHaveLength(1);
    const query = db.queries[0];
    expect(query?.text).toContain('FOR UPDATE SKIP LOCKED');
    expect(query?.text).toContain('ORDER BY priority DESC, id');
    expect(query?.text).toContain("state IN ('QUEUED', 'FAILED')");
    expect(query?.text).toContain('locked_until IS NULL OR locked_until < now()');
    expect(query?.text).toContain('queue = ANY($3::text[])');
    expect(query?.values).toEqual(['worker-a', 15_000, ['default', 'critical'], 5]);
    expect(query?.text).not.toContain('worker-a');
  });

  it('returns nothing for a worker that serves no queue', async () => {
    const db = createScriptedExecutor([]);
    await expect(claimJobs(db as never, { workerId: 'w', queues: [] })).resolves.toEqual([]);
    expect(db.queries).toHaveLength(0);
  });
});

describe('completeJob', () => {
  it('requires the lease owner and clears the lock', async () => {
    const db = createScriptedExecutor([[{ id: 'job-1' }], []]);
    const owned = await completeJob(db as never, {
      jobId: 'job-1',
      workerId: 'worker-a',
      result: { sent: true },
    });
    const stale = await completeJob(db as never, { jobId: 'job-1', workerId: 'worker-b' });

    expect(owned).toBe(true);
    expect(stale).toBe(false);
    const query = db.queries[0];
    expect(query?.text).toContain("state = 'SUCCEEDED'");
    expect(query?.text).toContain("AND state = 'RUNNING'");
    expect(query?.text).toContain('AND locked_by = $3');
    expect(query?.values).toEqual(['{"sent":true}', 'job-1', 'worker-a']);
  });
});

describe('failJob', () => {
  it('retries with a bound backoff while attempts remain', async () => {
    const db = createScriptedExecutor([
      [{ id: 'job-1', state: 'FAILED', attempts: 2, max_attempts: 5 }],
    ]);
    const result = await failJob(db as never, {
      jobId: 'job-1',
      workerId: 'worker-a',
      error: 'smtp timeout for ada@example.com',
      backoffMs: 4_000,
    });

    expect(result).toEqual({ id: 'job-1', state: 'FAILED', attempts: 2, maxAttempts: 5 });
    const query = db.queries[0];
    expect(query?.text).toContain('attempts >= max_attempts');
    expect(query?.values[1]).toBe('smtp timeout for [REDACTED_EMAIL]');
    expect(query?.values[3]).toBe(4_000);
    expect(query?.text).not.toContain('ada@example.com');
  });

  it('dead-letters immediately when not retryable', async () => {
    const db = createScriptedExecutor([
      [{ id: 'job-1', state: 'DEAD_LETTER', attempts: 1, max_attempts: 5 }],
    ]);
    const result = await failJob(db as never, {
      jobId: 'job-1',
      workerId: 'worker-a',
      error: 'payload did not parse',
      retryable: false,
      backoffMs: 1_000,
    });
    expect(result?.state).toBe('DEAD_LETTER');
    expect(db.queries[0]?.values[0]).toBe(false);
  });

  it('reports null when the lease was lost, so a stale worker does not overwrite', async () => {
    const db = createScriptedExecutor([[]]);
    await expect(
      failJob(db as never, {
        jobId: 'job-1',
        workerId: 'worker-a',
        error: 'boom',
        backoffMs: 1_000,
      }),
    ).resolves.toBeNull();
  });
});

describe('lookups', () => {
  it('finds a job by key and reports a succeeded key', async () => {
    const db = createScriptedExecutor([
      [job({ state: 'SUCCEEDED' })],
      [{ state: 'SUCCEEDED' }],
      [{ state: 'FAILED' }],
    ]);
    const found = await findJobByKey(db as never, 'key');
    expect(found?.state).toBe('SUCCEEDED');
    await expect(hasSucceededJob(db as never, 'key')).resolves.toBe(true);
    await expect(hasSucceededJob(db as never, 'other')).resolves.toBe(false);
  });
});
