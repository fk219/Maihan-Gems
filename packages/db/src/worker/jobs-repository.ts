/**
 * packages/db/src/worker/jobs-repository.ts
 *
 * The job queue (technical_design/27). Every function here is a single
 * statement, so each is atomic without an explicit transaction; the caller owns
 * any larger transaction boundary (technical_design/04).
 *
 * Guarantees:
 *   - `SKIP LOCKED` plus a lease: many workers, no collision, and no job that
 *     can be permanently orphaned by a crash (doc 27 §2).
 *   - `job_key` is the idempotency key. A duplicate enqueue returns the
 *     ORIGINAL row with `inserted: false`; it never overwrites the payload of a
 *     job that is already running (doc 27 §3).
 *   - Completion and failure require the caller to still own the lease
 *     (`state='RUNNING' AND locked_by=worker`). A stale worker that woke up
 *     after its lease was reclaimed cannot overwrite the new owner's result.
 *   - Exhaustion reaches `DEAD_LETTER` with the last error retained; a
 *     non-retryable failure dead-letters on the first attempt.
 *
 * Every dynamic value is a bound parameter.
 */
import { sql } from 'drizzle-orm';

import type { CatalogDatabase } from '../catalog/executor.js';
import { redactErrorText } from './outbox-repository.js';

export type JobState = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'DEAD_LETTER' | 'CANCELLED';

export interface JobRow extends Record<string, unknown> {
  readonly id: string;
  readonly job_key: string | null;
  readonly queue: string;
  readonly job_type: string;
  readonly payload: unknown;
  readonly state: JobState;
  readonly priority: number;
  readonly attempts: number;
  readonly max_attempts: number;
  readonly locked_by: string | null;
  readonly locked_until: Date | string | null;
  readonly run_after: Date | string;
  readonly last_error: string | null;
  readonly result: unknown;
  readonly started_at: Date | string | null;
  readonly finished_at: Date | string | null;
  readonly created_at: Date | string;
  readonly updated_at: Date | string;
}

const JOB_COLUMNS = sql`
  id, job_key, queue, job_type, payload, state, priority, attempts,
  max_attempts, locked_by, locked_until, run_after, last_error, result,
  started_at, finished_at, created_at, updated_at
`;

export interface EnqueueJobInput {
  /** Idempotency key. Null/absent means "always insert". */
  readonly jobKey?: string | null;
  readonly queue: string;
  readonly jobType: string;
  /** A JSON object. Validated here, never by string interpolation. */
  readonly payload?: Record<string, unknown>;
  readonly priority?: number;
  readonly maxAttempts?: number;
  /** When the job becomes eligible. Absent means now. */
  readonly runAfter?: Date | null;
}

export interface EnqueueJobResult {
  readonly job: JobRow;
  /** False when `job_key` already existed; `job` is then the original row. */
  readonly inserted: boolean;
}

function assertObjectPayload(payload: Record<string, unknown> | undefined): string {
  if (payload === undefined) return '{}';
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('JOBS: payload must be a JSON object');
  }
  return JSON.stringify(payload);
}

/**
 * Enqueue a job. Idempotent on `job_key`: the second call is a no-op that
 * reports the original job.
 */
export async function enqueueJob(
  db: CatalogDatabase,
  input: EnqueueJobInput,
): Promise<EnqueueJobResult> {
  const jobKey = input.jobKey ?? null;
  const payloadJson = assertObjectPayload(input.payload);
  const priority = Number.isInteger(input.priority)
    ? Math.min(Math.max(input.priority as number, 0), 32_767)
    : 100;
  const maxAttempts =
    Number.isInteger(input.maxAttempts) && (input.maxAttempts as number) > 0
      ? Math.min(input.maxAttempts as number, 32_767)
      : 5;

  const inserted = await db.execute<JobRow>(sql`
    INSERT INTO jobs (job_key, queue, job_type, payload, priority, max_attempts, run_after)
    VALUES (
      ${jobKey},
      ${input.queue},
      ${input.jobType},
      ${payloadJson}::jsonb,
      ${priority},
      ${maxAttempts},
      COALESCE(${input.runAfter ?? null}::timestamptz, now())
    )
    ON CONFLICT (job_key) DO NOTHING
    RETURNING ${JOB_COLUMNS}
  `);

  const insertedRow = inserted.rows[0];
  if (insertedRow !== undefined) return { job: insertedRow, inserted: true };

  // No row means either the key already existed, or a NULL key collided with
  // nothing and the insert should have succeeded. The latter is impossible
  // under the unique index, so a missing key here is a real bug.
  if (jobKey === null) {
    throw new Error('JOBS: insert returned no row for a job without a key');
  }

  const existing = await db.execute<JobRow>(sql`
    SELECT ${JOB_COLUMNS} FROM jobs WHERE job_key = ${jobKey} LIMIT 1
  `);
  const row = existing.rows[0];
  if (row === undefined) {
    throw new Error('JOBS: idempotent enqueue lost the conflicting row');
  }
  return { job: row, inserted: false };
}

export interface ClaimJobsOptions {
  /** Identity of this worker; stored in `locked_by` for lease ownership. */
  readonly workerId: string;
  /** Queues this worker serves. Empty means no queue (returns nothing). */
  readonly queues: readonly string[];
  readonly limit?: number;
  readonly leaseMs?: number;
}

/**
 * Claim due jobs for this worker.
 *
 * A `RUNNING` row whose lease expired is reclaimable: that is the crash
 * recovery path, and it is why `locked_until` is written on every claim.
 */
export async function claimJobs(
  db: CatalogDatabase,
  options: ClaimJobsOptions,
): Promise<JobRow[]> {
  if (options.queues.length === 0) return [];
  const limit = Math.min(Math.max(Math.floor(options.limit ?? 20), 1), 200);
  const leaseMs = Math.min(Math.max(Math.floor(options.leaseMs ?? 30_000), 1_000), 3_600_000);

  const result = await db.execute<JobRow>(sql`
    UPDATE jobs
       SET state = 'RUNNING',
           locked_by = ${options.workerId},
           locked_until = now() + (${leaseMs} * interval '1 millisecond'),
           attempts = attempts + 1,
           started_at = COALESCE(started_at, now()),
           updated_at = now()
     WHERE id IN (
       SELECT id
         FROM jobs
        WHERE queue = ANY(${sql.param([...options.queues])}::text[])
          AND run_after <= now()
          AND (
            state IN ('QUEUED', 'FAILED')
            OR (state = 'RUNNING' AND (locked_until IS NULL OR locked_until < now()))
          )
        ORDER BY priority DESC, id
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
     )
    RETURNING ${JOB_COLUMNS}
  `);

  return result.rows;
}

export interface CompleteJobOptions {
  readonly jobId: string;
  readonly workerId: string;
  readonly result?: Record<string, unknown>;
}

/** Mark a job succeeded. Returns false when this worker no longer owns it. */
export async function completeJob(
  db: CatalogDatabase,
  options: CompleteJobOptions,
): Promise<boolean> {
  const resultJson =
    options.result === undefined || options.result === null ? null : JSON.stringify(options.result);

  const result = await db.execute<{ id: string }>(sql`
    UPDATE jobs
       SET state = 'SUCCEEDED',
           finished_at = now(),
           locked_by = NULL,
           locked_until = NULL,
           last_error = NULL,
           result = COALESCE(${resultJson}::jsonb, result),
           updated_at = now()
     WHERE id = ${options.jobId}
       AND state = 'RUNNING'
       AND locked_by = ${options.workerId}
    RETURNING id
  `);

  return result.rows.length > 0;
}

export interface FailJobOptions {
  readonly jobId: string;
  readonly workerId: string;
  /** Safe developer text; redacted again before it is stored. */
  readonly error: string;
  /** False dead-letters immediately (a poison payload). */
  readonly retryable?: boolean;
  /** Delay before the next attempt; ignored when dead-lettering. */
  readonly backoffMs: number;
}

export interface FailJobResult {
  readonly id: string;
  readonly state: JobState;
  readonly attempts: number;
  readonly maxAttempts: number;
}

/**
 * Record a failed attempt. `attempts` was incremented at claim time, so the
 * row's own `max_attempts` decides exhaustion without a second read.
 */
export async function failJob(
  db: CatalogDatabase,
  options: FailJobOptions,
): Promise<FailJobResult | null> {
  const retryable = options.retryable !== false;
  const error = redactErrorText(options.error);
  const backoffMs = Math.max(0, Math.floor(options.backoffMs));

  const result = await db.execute<{
    id: string;
    state: JobState;
    attempts: number;
    max_attempts: number;
  }>(sql`
    UPDATE jobs
       SET state = (CASE
             WHEN NOT ${retryable} THEN 'DEAD_LETTER'
             WHEN attempts >= max_attempts THEN 'DEAD_LETTER'
             ELSE 'FAILED'
           END)::job_state,
           last_error = ${error},
           run_after = CASE
             WHEN ${retryable} AND attempts < max_attempts
               THEN now() + (${backoffMs} * interval '1 millisecond')
             ELSE run_after
           END,
           locked_by = NULL,
           locked_until = NULL,
           finished_at = CASE
             WHEN (NOT ${retryable}) OR attempts >= max_attempts THEN now()
             ELSE NULL
           END,
           updated_at = now()
     WHERE id = ${options.jobId}
       AND state = 'RUNNING'
       AND locked_by = ${options.workerId}
    RETURNING id, state, attempts, max_attempts
  `);

  const row = result.rows[0];
  if (row === undefined) return null;
  return {
    id: row.id,
    state: row.state,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
  };
}

/** Look up a job by idempotency key, for admin views and tests. */
export async function findJobByKey(
  db: CatalogDatabase,
  jobKey: string,
): Promise<JobRow | null> {
  const result = await db.execute<JobRow>(sql`
    SELECT ${JOB_COLUMNS} FROM jobs WHERE job_key = ${jobKey} LIMIT 1
  `);
  return result.rows[0] ?? null;
}

/** Whether a `job_key` has already succeeded; used to short-circuit replays. */
export async function hasSucceededJob(
  db: CatalogDatabase,
  jobKey: string,
): Promise<boolean> {
  const result = await db.execute<{ state: JobState }>(sql`
    SELECT state FROM jobs WHERE job_key = ${jobKey} LIMIT 1
  `);
  return result.rows[0]?.state === 'SUCCEEDED';
}
