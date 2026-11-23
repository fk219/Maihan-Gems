/**
 * apps/worker/src/dispatch/dispatcher.ts
 *
 * The outbox dispatcher (ADR-020, technical_design/26 §2).
 *
 * One pass is:
 *
 *   claim a batch (SKIP LOCKED + lease)
 *     → for each event, for each registered consumer
 *         → skip if `event_consumers` already has it
 *         → handle
 *         → record the consumer
 *     → mark the event published, or failed with backoff / dead-letter
 *
 * Ordering of the ledger write matters and is deliberate. The consumer row is
 * written AFTER the handler succeeds. A crash between the side effect and the
 * ledger write re-runs the handler on the next attempt; that is safe only
 * because every handler's side effect is itself idempotent (a `job_key`
 * enqueue). Doc 26 §5 states the same pairing: `event_consumers` plus
 * `job_key`, neither sufficient alone.
 *
 * An event with no consumer in THIS process is marked published. That is not a
 * silent drop: another deployment may own that consumer, and an event with no
 * consumer at all is a routing decision, not a delivery failure. The log says
 * so explicitly.
 *
 * Shutdown: `run(signal)` stops claiming new batches when the signal aborts,
 * finishes the event it is currently handling, and resolves. It never kills a
 * handler mid-flight — that is what the lease is for.
 */
import {
  claimOutboxBatch,
  computeBackoffMs,
  hasEventConsumer,
  markOutboxFailed,
  markOutboxPublished,
  recordEventConsumer,
  type BackoffPolicy,
  type CatalogDatabase,
  type DomainEventRow,
  DEFAULT_BACKOFF,
  DEFAULT_MAX_ATTEMPTS,
} from '@maihan/db';

import { delay } from './delay.js';
import { describeFailure, isPermanentFailure } from './errors.js';
import { SILENT_LOGGER, type WorkerLogger } from './logger.js';
import type { DispatchEvent, HandlerRegistry } from './registry.js';

export interface OutboxDispatcherOptions {
  readonly db: CatalogDatabase;
  readonly registry: HandlerRegistry;
  readonly logger?: WorkerLogger;
  /** Events per claim. Default 25. */
  readonly batchSize?: number;
  /** Claim lease. Default 30s. */
  readonly leaseMs?: number;
  /** Idle poll interval. Default 1s. */
  readonly idleDelayMs?: number;
  readonly maxAttempts?: number;
  readonly backoff?: BackoffPolicy;
  /** Injected for deterministic backoff tests. */
  readonly random?: () => number;
}

export interface DispatchPassResult {
  readonly claimed: number;
  readonly published: number;
  readonly failed: number;
  readonly deadLettered: number;
  /** Consumers skipped because the ledger already had them. */
  readonly duplicates: number;
  /** Claimed events not started because shutdown began mid-batch. */
  readonly abandoned: number;
  /** Failures recorded against an event another worker had already published. */
  readonly lost: number;
}

function toDispatchEvent(row: DomainEventRow): DispatchEvent {
  return {
    rowId: row.id,
    eventId: row.event_id,
    eventType: row.event_type,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    aggregateVersion: row.aggregate_version,
    payload: row.payload,
    occurredAt: new Date(row.occurred_at),
    traceId: row.trace_id,
    attempts: row.attempts,
  };
}

export class OutboxDispatcher {
  private readonly db: CatalogDatabase;
  private readonly registry: HandlerRegistry;
  private readonly logger: WorkerLogger;
  private readonly batchSize: number;
  private readonly leaseMs: number;
  private readonly idleDelayMs: number;
  private readonly maxAttempts: number;
  private readonly backoff: BackoffPolicy;
  private readonly random: () => number;

  constructor(options: OutboxDispatcherOptions) {
    this.db = options.db;
    this.registry = options.registry;
    this.logger = options.logger ?? SILENT_LOGGER;
    this.batchSize = options.batchSize ?? 25;
    this.leaseMs = options.leaseMs ?? 30_000;
    this.idleDelayMs = options.idleDelayMs ?? 1_000;
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.backoff = options.backoff ?? DEFAULT_BACKOFF;
    this.random = options.random ?? Math.random;
  }

  /**
   * Claim and process one batch. `signal` is checked BEFORE each event, so an
   * aborted dispatcher starts nothing new; the event already in hand finishes.
   */
  async runOnce(signal?: AbortSignal): Promise<DispatchPassResult> {
    const rows = await claimOutboxBatch(this.db, {
      limit: this.batchSize,
      leaseMs: this.leaseMs,
    });

    let published = 0;
    let failed = 0;
    let deadLettered = 0;
    let duplicates = 0;
    let abandoned = 0;
    let lost = 0;

    for (const row of rows) {
      if (signal?.aborted === true) {
        abandoned += 1;
        continue;
      }

      const event = toDispatchEvent(row);
      const handlers = this.registry.handlersFor(row.event_type);

      if (handlers.length === 0) {
        await markOutboxPublished(this.db, row.id);
        published += 1;
        this.logger.info('dispatch.no_consumer', 'Event published with no consumer in this worker', {
          event_type: row.event_type,
          event_id: row.event_id,
        });
        continue;
      }

      const outcome = await this.dispatchConsumers(event, row, handlers);
      duplicates += outcome.duplicates;

      if (outcome.error === null) {
        await markOutboxPublished(this.db, row.id);
        published += 1;
        continue;
      }

      const retryable = !isPermanentFailure(outcome.error);
      const backoffMs = computeBackoffMs(row.attempts, this.backoff, this.random);
      const marked = await markOutboxFailed(this.db, {
        eventRowId: row.id,
        error: describeFailure(outcome.error),
        retryable,
        backoffMs,
        maxAttempts: this.maxAttempts,
      });

      if (marked?.status === 'DEAD_LETTER') {
        deadLettered += 1;
        this.logger.error('dispatch.dead_letter', 'Event dead-lettered', {
          event_type: row.event_type,
          event_id: row.event_id,
          attempts: row.attempts,
          error: describeFailure(outcome.error),
        });
      } else if (marked === null) {
        // The lease expired, another worker published the event, and this
        // failure arrived too late to matter. Do not overwrite it.
        lost += 1;
        this.logger.warn('dispatch.lease_lost', 'Failure arrived after the event was published', {
          event_type: row.event_type,
          event_id: row.event_id,
        });
      } else {
        failed += 1;
        this.logger.warn('dispatch.retry', 'Event failed and will be retried', {
          event_type: row.event_type,
          event_id: row.event_id,
          attempts: row.attempts,
          backoff_ms: backoffMs,
        });
      }
    }

    return { claimed: rows.length, published, failed, deadLettered, duplicates, abandoned, lost };
  }

  /**
   * Run the loop until `signal` aborts. A database error is logged and the
   * loop continues: a dispatcher that dies because one claim failed is a
   * worker that needs a human at 3am for a transient blip.
   */
  async run(signal: AbortSignal): Promise<void> {
    this.logger.info('dispatch.started', 'Outbox dispatcher started', {
      event_types: this.registry.eventTypes(),
    });

    while (!signal.aborted) {
      try {
        const result = await this.runOnce(signal);
        if (result.claimed === 0) {
          await delay(this.idleDelayMs, signal);
        }
      } catch (error) {
        this.logger.error('dispatch.pass_failed', 'Outbox dispatcher pass failed', {
          error: describeFailure(error),
        });
        await delay(this.idleDelayMs, signal);
      }
    }

    this.logger.info('dispatch.stopped', 'Outbox dispatcher stopped claiming new work');
  }

  private async dispatchConsumers(
    event: DispatchEvent,
    row: DomainEventRow,
    handlers: ReturnType<HandlerRegistry['handlersFor']>,
  ): Promise<{ error: unknown | null; duplicates: number }> {
    let duplicates = 0;

    for (const registration of handlers) {
      const key = { consumerName: registration.consumerName, eventRowId: row.id };
      if (await hasEventConsumer(this.db, key)) {
        duplicates += 1;
        this.logger.info('dispatch.duplicate', 'Consumer already handled this event', {
          event_type: event.eventType,
          event_id: event.eventId,
          consumer: registration.consumerName,
        });
        continue;
      }

      try {
        await registration.handle(event, { logger: this.logger });
      } catch (error) {
        return { error, duplicates };
      }

      await recordEventConsumer(this.db, key);
    }

    return { error: null, duplicates };
  }
}
