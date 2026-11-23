/**
 * apps/worker/src/dispatch/job-runner.ts
 *
 * The job queue consumer (technical_design/27). Mirrors the dispatcher's
 * lifecycle:
 *
 *   claim (SKIP LOCKED + lease) → handler → complete, or fail with backoff
 *
 * Differences from the outbox that matter:
 *   - a job addressed to this worker with NO handler is poison, so it
 *     dead-letters on the first attempt instead of being published;
 *   - completion and failure are conditional on still owning the lease, so a
 *     worker that woke up after its lease was reclaimed cannot overwrite the
 *     new owner's outcome;
 *   - `job_key` is the idempotency boundary, and the enqueue side enforces it.
 */
import {
  claimJobs,
  completeJob,
  computeBackoffMs,
  failJob,
  DEFAULT_BACKOFF,
  type BackoffPolicy,
  type CatalogDatabase,
  type JobRow,
} from '@maihan/db';

import { delay } from './delay.js';
import { describeFailure, isPermanentFailure } from './errors.js';
import { SILENT_LOGGER, type WorkerLogger } from './logger.js';
import type { ClaimedJob, JobHandlerRegistry } from './registry.js';

export interface JobRunnerOptions {
  readonly db: CatalogDatabase;
  readonly registry: JobHandlerRegistry;
  readonly workerId: string;
  readonly queues: readonly string[];
  readonly logger?: WorkerLogger;
  readonly batchSize?: number;
  readonly leaseMs?: number;
  readonly idleDelayMs?: number;
  readonly backoff?: BackoffPolicy;
  readonly random?: () => number;
}

export interface JobPassResult {
  readonly claimed: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly deadLettered: number;
  /** Claims lost to another worker before completion. */
  readonly leaseLost: number;
  readonly abandoned: number;
}

function toClaimedJob(row: JobRow): ClaimedJob {
  return {
    id: row.id,
    jobKey: row.job_key,
    queue: row.queue,
    jobType: row.job_type,
    payload: row.payload,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
  };
}

export class JobRunner {
  private readonly db: CatalogDatabase;
  private readonly registry: JobHandlerRegistry;
  private readonly workerId: string;
  private readonly queues: readonly string[];
  private readonly logger: WorkerLogger;
  private readonly batchSize: number;
  private readonly leaseMs: number;
  private readonly idleDelayMs: number;
  private readonly backoff: BackoffPolicy;
  private readonly random: () => number;

  constructor(options: JobRunnerOptions) {
    this.db = options.db;
    this.registry = options.registry;
    this.workerId = options.workerId;
    this.queues = [...options.queues];
    this.logger = options.logger ?? SILENT_LOGGER;
    this.batchSize = options.batchSize ?? 10;
    this.leaseMs = options.leaseMs ?? 30_000;
    this.idleDelayMs = options.idleDelayMs ?? 1_000;
    this.backoff = options.backoff ?? DEFAULT_BACKOFF;
    this.random = options.random ?? Math.random;
  }

  async runOnce(signal?: AbortSignal): Promise<JobPassResult> {
    const rows = await claimJobs(this.db, {
      workerId: this.workerId,
      queues: this.queues,
      limit: this.batchSize,
      leaseMs: this.leaseMs,
    });

    let succeeded = 0;
    let failed = 0;
    let deadLettered = 0;
    let leaseLost = 0;
    let abandoned = 0;

    for (const row of rows) {
      if (signal?.aborted === true) {
        // Leave it RUNNING; the lease expires and another worker reclaims it.
        abandoned += 1;
        continue;
      }

      const job = toClaimedJob(row);
      const handler = this.registry.handlerFor(row.job_type);

      if (handler === null) {
        const result = await failJob(this.db, {
          jobId: row.id,
          workerId: this.workerId,
          error: `no handler registered for ${row.job_type}`,
          retryable: false,
          backoffMs: 0,
        });
        if (result === null) leaseLost += 1;
        else deadLettered += 1;
        this.logger.error('job.no_handler', 'Job has no handler and was dead-lettered', {
          job_id: row.id,
          job_type: row.job_type,
        });
        continue;
      }

      try {
        await handler(job, { logger: this.logger });
      } catch (error) {
        const retryable = !isPermanentFailure(error);
        const backoffMs = computeBackoffMs(row.attempts, this.backoff, this.random);
        const result = await failJob(this.db, {
          jobId: row.id,
          workerId: this.workerId,
          error: describeFailure(error),
          retryable,
          backoffMs,
        });
        if (result === null) {
          leaseLost += 1;
          this.logger.warn('job.lease_lost', 'Job failed after its lease was reclaimed', {
            job_id: row.id,
            job_type: row.job_type,
          });
        } else if (result.state === 'DEAD_LETTER') {
          deadLettered += 1;
          this.logger.error('job.dead_letter', 'Job dead-lettered', {
            job_id: row.id,
            job_type: row.job_type,
            attempts: result.attempts,
            error: describeFailure(error),
          });
        } else {
          failed += 1;
          this.logger.warn('job.retry', 'Job failed and will be retried', {
            job_id: row.id,
            job_type: row.job_type,
            attempts: result.attempts,
            backoff_ms: backoffMs,
          });
        }
        continue;
      }

      const completed = await completeJob(this.db, {
        jobId: row.id,
        workerId: this.workerId,
      });
      if (completed) {
        succeeded += 1;
      } else {
        leaseLost += 1;
        this.logger.warn('job.lease_lost', 'Job completed after its lease was reclaimed', {
          job_id: row.id,
          job_type: row.job_type,
        });
      }
    }

    return { claimed: rows.length, succeeded, failed, deadLettered, leaseLost, abandoned };
  }

  async run(signal: AbortSignal): Promise<void> {
    this.logger.info('jobs.started', 'Job runner started', {
      worker_id: this.workerId,
      queues: this.queues,
    });

    while (!signal.aborted) {
      try {
        const result = await this.runOnce(signal);
        if (result.claimed === 0) {
          await delay(this.idleDelayMs, signal);
        }
      } catch (error) {
        this.logger.error('jobs.pass_failed', 'Job runner pass failed', {
          error: describeFailure(error),
        });
        await delay(this.idleDelayMs, signal);
      }
    }

    this.logger.info('jobs.stopped', 'Job runner stopped claiming new work');
  }
}
