/**
 * apps/worker/src/test/fake-db.ts
 *
 * An in-memory executor for the worker suites. It emulates the SQL surface of
 * `packages/db/src/worker` — claim/publish/fail, the consumer ledger, and the
 * job queue — so the dispatcher and job runner can be driven end to end with no
 * database and no DATABASE_URL.
 *
 * It is deliberately NOT a general SQL engine. Every statement is matched by
 * its distinctive prefix; an unmatched statement throws loudly, so a new query
 * cannot silently pass through a test that did not account for it.
 *
 * Claim atomicity: the mutation happens synchronously at the top of `execute`,
 * before any `await`. Two concurrent claims therefore cannot both see the same
 * row, which is the property `FOR UPDATE SKIP LOCKED` provides in PostgreSQL.
 */

export type FakeEventStatus = 'PENDING' | 'PUBLISHED' | 'FAILED' | 'DEAD_LETTER';
export type FakeJobState = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'DEAD_LETTER' | 'CANCELLED';

export interface FakeEvent {
  id: number;
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number | null;
  payload: unknown;
  traceId: string | null;
  status: FakeEventStatus;
  attempts: number;
  lastError: string | null;
  occurredAt: Date;
  availableAt: Date;
  publishedAt: Date | null;
}

export interface FakeJob {
  id: string;
  jobKey: string | null;
  queue: string;
  jobType: string;
  payload: unknown;
  state: FakeJobState;
  priority: number;
  attempts: number;
  maxAttempts: number;
  lockedBy: string | null;
  lockedUntil: Date | null;
  runAfter: Date;
  lastError: string | null;
  result: unknown;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Captured {
  text: string;
  values: unknown[];
}

function isStringChunk(chunk: unknown): chunk is { value: string[] } {
  if (typeof chunk !== 'object' || chunk === null) return false;
  const shape = chunk as { value?: unknown; encoder?: unknown };
  // A `Param` also carries `value` and, for an array param, that value is a
  // string[]. Drizzle gives Param an `encoder` own property; StringChunk has
  // only `value`. Checking for it keeps this helper free of a drizzle import,
  // which apps/worker must not have (the boundary lint forbids a database
  // driver here).
  if ('encoder' in shape) return false;
  return (
    Array.isArray(shape.value) &&
    shape.value.length > 0 &&
    shape.value.every((part) => typeof part === 'string')
  );
}

function capture(query: unknown): Captured {
  const chunks = (query as { queryChunks?: unknown[] }).queryChunks ?? [];
  const parts: string[] = [];
  const values: unknown[] = [];
  const walk = (items: readonly unknown[]): void => {
    for (const chunk of items) {
      if (chunk === null || chunk === undefined) {
        values.push(null);
        parts.push(`$${values.length}`);
        continue;
      }
      if (isStringChunk(chunk)) {
        parts.push(chunk.value.join(''));
        continue;
      }
      const shape = chunk as { value?: unknown; queryChunks?: unknown[] };
      if (Array.isArray(shape.queryChunks)) {
        walk(shape.queryChunks);
        continue;
      }
      if (typeof chunk === 'object' && 'value' in shape) {
        values.push(shape.value);
        parts.push(`$${values.length}`);
        continue;
      }
      values.push(chunk);
      parts.push(`$${values.length}`);
    }
  };
  walk(chunks);
  return { text: parts.join('').replace(/\s+/g, ' ').trim(), values };
}

function eventRecord(row: FakeEvent): Record<string, unknown> {
  return {
    id: String(row.id),
    event_id: row.eventId,
    event_type: row.eventType,
    aggregate_type: row.aggregateType,
    aggregate_id: row.aggregateId,
    aggregate_version: row.aggregateVersion,
    payload: row.payload,
    trace_id: row.traceId,
    status: row.status,
    attempts: row.attempts,
    last_error: row.lastError,
    occurred_at: row.occurredAt,
    available_at: row.availableAt,
    published_at: row.publishedAt,
  };
}

function jobRecord(row: FakeJob): Record<string, unknown> {
  return {
    id: row.id,
    job_key: row.jobKey,
    queue: row.queue,
    job_type: row.jobType,
    payload: row.payload,
    state: row.state,
    priority: row.priority,
    attempts: row.attempts,
    max_attempts: row.maxAttempts,
    locked_by: row.lockedBy,
    locked_until: row.lockedUntil,
    run_after: row.runAfter,
    last_error: row.lastError,
    result: row.result,
    started_at: row.startedAt,
    finished_at: row.finishedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export interface FakeWorkerDb {
  readonly events: FakeEvent[];
  readonly jobs: FakeJob[];
  readonly consumers: Set<string>;
  now: Date;
  claimCount: number;
  jobClaimCount: number;
  advance(ms: number): void;
  addEvent(input: {
    eventType: string;
    payload: unknown;
    aggregateType?: string;
    aggregateId?: string;
  }): FakeEvent;
  execute(query: unknown): Promise<{ rows: unknown[] }>;
}

export function createFakeWorkerDb(start: Date = new Date('2026-11-23T10:00:00.000Z')): FakeWorkerDb {
  const events: FakeEvent[] = [];
  const jobs: FakeJob[] = [];
  const consumers = new Set<string>();
  let eventSequence = 0;
  let jobSequence = 0;

  const state: FakeWorkerDb = {
    events,
    jobs,
    consumers,
    now: start,
    claimCount: 0,
    jobClaimCount: 0,
    advance(ms: number): void {
      state.now = new Date(state.now.getTime() + ms);
    },
    addEvent(input): FakeEvent {
      eventSequence += 1;
      const event: FakeEvent = {
        id: eventSequence,
        eventId: `00000000-0000-4000-8000-${String(eventSequence).padStart(12, '0')}`,
        eventType: input.eventType,
        aggregateType: input.aggregateType ?? 'order',
        aggregateId: input.aggregateId ?? '22222222-2222-4222-8222-222222222222',
        aggregateVersion: 1,
        payload: input.payload,
        traceId: null,
        status: 'PENDING',
        attempts: 0,
        lastError: null,
        occurredAt: state.now,
        availableAt: state.now,
        publishedAt: null,
      };
      events.push(event);
      return event;
    },
    async execute(query: unknown): Promise<{ rows: unknown[] }> {
      const { text, values } = capture(query);

      // ---- outbox claim ---------------------------------------------------
      if (text.startsWith('UPDATE domain_events SET attempts = attempts + 1')) {
        state.claimCount += 1;
        const leaseMs = Number(values[0] ?? 30_000);
        const limit = Number(values[1] ?? 50);
        const due = events
          .filter(
            (row) =>
              (row.status === 'PENDING' || row.status === 'FAILED') &&
              row.availableAt.getTime() <= state.now.getTime(),
          )
          .sort((a, b) => a.id - b.id)
          .slice(0, limit);
        for (const row of due) {
          row.attempts += 1;
          row.availableAt = new Date(state.now.getTime() + leaseMs);
        }
        return { rows: due.map(eventRecord) };
      }

      // ---- mark published -------------------------------------------------
      if (text.includes("SET status = 'PUBLISHED'")) {
        const id = Number(values[0]);
        const row = events.find((entry) => entry.id === id);
        if (row === undefined || row.status === 'PUBLISHED') return { rows: [] };
        row.status = 'PUBLISHED';
        row.publishedAt = state.now;
        row.lastError = null;
        return { rows: [{ id: String(row.id), published_at: row.publishedAt }] };
      }

      // ---- mark failed ----------------------------------------------------
      if (text.startsWith('UPDATE domain_events SET status = (CASE')) {
        const retryable = values[0] !== false;
        const maxAttempts = Number(values[1] ?? 5);
        const error = String(values[2] ?? '');
        const backoffMs = Number(values[5] ?? 0);
        const id = Number(values[6]);
        const row = events.find((entry) => entry.id === id);
        if (row === undefined) return { rows: [] };
        row.lastError = error;
        if (!retryable || row.attempts >= maxAttempts) {
          row.status = 'DEAD_LETTER';
        } else {
          row.status = 'FAILED';
          row.availableAt = new Date(state.now.getTime() + backoffMs);
        }
        return { rows: [{ id: String(row.id), status: row.status, attempts: row.attempts }] };
      }

      // ---- consumer ledger ------------------------------------------------
      if (text.startsWith('SELECT consumer_name FROM event_consumers')) {
        const key = `${String(values[0])}:${String(values[1])}`;
        return { rows: consumers.has(key) ? [{ consumer_name: values[0] }] : [] };
      }
      if (text.startsWith('INSERT INTO event_consumers')) {
        const key = `${String(values[0])}:${String(values[1])}`;
        if (consumers.has(key)) return { rows: [] };
        consumers.add(key);
        return { rows: [{ consumer_name: values[0] }] };
      }

      // ---- enqueue job ----------------------------------------------------
      if (text.startsWith('INSERT INTO jobs')) {
        const jobKey = values[0] === null || values[0] === undefined ? null : String(values[0]);
        if (jobKey !== null && jobs.some((job) => job.jobKey === jobKey)) {
          return { rows: [] };
        }
        jobSequence += 1;
        const runAfter = values[6] === null || values[6] === undefined ? state.now : new Date(String(values[6]));
        const job: FakeJob = {
          id: `job-${jobSequence}`,
          jobKey,
          queue: String(values[1]),
          jobType: String(values[2]),
          payload: JSON.parse(String(values[3])),
          state: 'QUEUED',
          priority: Number(values[4] ?? 100),
          attempts: 0,
          maxAttempts: Number(values[5] ?? 5),
          lockedBy: null,
          lockedUntil: null,
          runAfter,
          lastError: null,
          result: null,
          startedAt: null,
          finishedAt: null,
          createdAt: state.now,
          updatedAt: state.now,
        };
        jobs.push(job);
        return { rows: [jobRecord(job)] };
      }

      if (text.startsWith('SELECT id, job_key, queue') && text.includes('WHERE job_key =')) {
        const job = jobs.find((entry) => entry.jobKey === String(values[0]));
        return { rows: job === undefined ? [] : [jobRecord(job)] };
      }
      if (text.startsWith('SELECT state FROM jobs WHERE job_key =')) {
        const job = jobs.find((entry) => entry.jobKey === String(values[0]));
        return { rows: job === undefined ? [] : [{ state: job.state }] };
      }

      // ---- claim jobs -----------------------------------------------------
      if (text.startsWith("UPDATE jobs SET state = 'RUNNING'")) {
        state.jobClaimCount += 1;
        const workerId = String(values[0]);
        const leaseMs = Number(values[1] ?? 30_000);
        const queues = Array.isArray(values[2]) ? (values[2] as unknown[]).map(String) : [];
        const limit = Number(values[3] ?? 20);
        const due = jobs
          .filter(
            (job) =>
              queues.includes(job.queue) &&
              job.runAfter.getTime() <= state.now.getTime() &&
              (job.state === 'QUEUED' ||
                job.state === 'FAILED' ||
                (job.state === 'RUNNING' &&
                  (job.lockedUntil === null || job.lockedUntil.getTime() < state.now.getTime()))),
          )
          .sort((a, b) => (b.priority - a.priority) || a.id.localeCompare(b.id))
          .slice(0, limit);
        for (const job of due) {
          job.state = 'RUNNING';
          job.lockedBy = workerId;
          job.lockedUntil = new Date(state.now.getTime() + leaseMs);
          job.attempts += 1;
          job.startedAt ??= state.now;
          job.updatedAt = state.now;
        }
        return { rows: due.map(jobRecord) };
      }

      // ---- complete job ---------------------------------------------------
      if (text.includes("SET state = 'SUCCEEDED', finished_at = now()")) {
        const resultJson = values[0] === null || values[0] === undefined ? null : String(values[0]);
        const jobId = String(values[1]);
        const workerId = String(values[2]);
        const job = jobs.find(
          (entry) => entry.id === jobId && entry.state === 'RUNNING' && entry.lockedBy === workerId,
        );
        if (job === undefined) return { rows: [] };
        job.state = 'SUCCEEDED';
        job.finishedAt = state.now;
        job.lockedBy = null;
        job.lockedUntil = null;
        job.lastError = null;
        if (resultJson !== null) job.result = JSON.parse(resultJson);
        return { rows: [{ id: job.id }] };
      }

      // ---- fail job -------------------------------------------------------
      if (text.startsWith('UPDATE jobs SET state = (CASE')) {
        const retryable = values[0] !== false;
        const error = String(values[1] ?? '');
        const backoffMs = Number(values[3] ?? 0);
        const jobId = String(values[5]);
        const workerId = String(values[6]);
        const job = jobs.find(
          (entry) => entry.id === jobId && entry.state === 'RUNNING' && entry.lockedBy === workerId,
        );
        if (job === undefined) return { rows: [] };
        job.lastError = error;
        if (!retryable || job.attempts >= job.maxAttempts) {
          job.state = 'DEAD_LETTER';
          job.finishedAt = state.now;
        } else {
          job.state = 'FAILED';
          job.runAfter = new Date(state.now.getTime() + backoffMs);
        }
        job.lockedBy = null;
        job.lockedUntil = null;
        return {
          rows: [
            { id: job.id, state: job.state, attempts: job.attempts, max_attempts: job.maxAttempts },
          ],
        };
      }

      // ---- reservation sweep (packages/db sweepExpiredReservations) -------
      if (text.includes("WHERE queue = 'inventory_reservations'") && text.includes("state = 'SUCCEEDED'")) {
        const due = jobs.filter(
          (job) =>
            job.queue === 'inventory_reservations' &&
            job.state === 'QUEUED' &&
            job.runAfter.getTime() <= state.now.getTime(),
        );
        for (const job of due) job.state = 'SUCCEEDED';
        return { rows: due.map((job) => ({ id: job.id, payload: job.payload })) };
      }
      if (text.startsWith('INSERT INTO domain_events')) {
        return { rows: [] };
      }

      throw new Error(`fake-worker-db: unmatched SQL — ${text.slice(0, 200)}`);
    },
  };

  return state;
}
