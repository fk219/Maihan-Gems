/**
 * apps/worker/src/dispatch/registry.ts
 *
 * The handler registry. An event type may have several consumers — doc 26's
 * catalogue gives most events two or three — and each consumer is an
 * independent unit of idempotency in `event_consumers`.
 *
 * Registration is validated at wiring time, not at delivery time:
 *   - a consumer name is required (it is the ledger key);
 *   - the same consumer may not be registered twice for the same event type,
 *     because that would run one consumer's side effect twice under one ledger
 *     row.
 *
 * The registry returns a COPY of the list, so a handler cannot mutate the
 * routing table mid-flight.
 */
import type { WorkerLogger } from './logger.js';

export interface DispatchEvent {
  /** `domain_events.id` (BIGINT as a string): the consumer ledger key. */
  readonly rowId: string;
  /** `domain_events.event_id` (UUID): the event's public identity. */
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: number | null;
  readonly payload: unknown;
  readonly occurredAt: Date;
  readonly traceId: string | null;
  readonly attempts: number;
}

export interface HandlerContext {
  readonly logger: WorkerLogger;
}

export type EventHandler = (event: DispatchEvent, context: HandlerContext) => Promise<void>;

export interface EventHandlerRegistration {
  /** Unique per event type; recorded in `event_consumers`. */
  readonly consumerName: string;
  readonly eventTypes: readonly string[];
  readonly handle: EventHandler;
}

export class HandlerRegistry {
  private readonly handlers = new Map<string, EventHandlerRegistration[]>();

  register(registration: EventHandlerRegistration): this {
    if (registration.consumerName.trim().length === 0) {
      throw new Error('HANDLERS: consumerName is required');
    }
    if (registration.eventTypes.length === 0) {
      throw new Error('HANDLERS: at least one event type is required');
    }
    for (const eventType of registration.eventTypes) {
      const existing = this.handlers.get(eventType) ?? [];
      if (existing.some((entry) => entry.consumerName === registration.consumerName)) {
        throw new Error(
          `HANDLERS: consumer ${registration.consumerName} is registered twice for ${eventType}`,
        );
      }
      existing.push(registration);
      this.handlers.set(eventType, existing);
    }
    return this;
  }

  handlersFor(eventType: string): readonly EventHandlerRegistration[] {
    return [...(this.handlers.get(eventType) ?? [])];
  }

  /** Event types with at least one consumer in this process. */
  eventTypes(): readonly string[] {
    return [...this.handlers.keys()].sort();
  }
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export interface ClaimedJob {
  readonly id: string;
  readonly jobKey: string | null;
  readonly queue: string;
  readonly jobType: string;
  readonly payload: unknown;
  /** Already incremented by the claim. */
  readonly attempts: number;
  readonly maxAttempts: number;
}

export type JobHandler = (job: ClaimedJob, context: HandlerContext) => Promise<void>;

export class JobHandlerRegistry {
  private readonly handlers = new Map<string, JobHandler>();

  register(jobType: string, handler: JobHandler): this {
    if (jobType.trim().length === 0) throw new Error('JOBS: jobType is required');
    if (this.handlers.has(jobType)) {
      throw new Error(`JOBS: handler for ${jobType} is registered twice`);
    }
    this.handlers.set(jobType, handler);
    return this;
  }

  handlerFor(jobType: string): JobHandler | null {
    return this.handlers.get(jobType) ?? null;
  }

  jobTypes(): readonly string[] {
    return [...this.handlers.keys()].sort();
  }
}
