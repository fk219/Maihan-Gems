/**
 * packages/db/src/worker/outbox-repository.ts
 *
 * The transactional outbox's consumer side (ADR-020, technical_design/26).
 *
 * apps/web writes `domain_events` in the same transaction as the state change.
 * This module is the ONLY writer of the dispatch columns — `status`,
 * `attempts`, `available_at`, `last_error`, `published_at` — and the only code
 * that reads unpublished rows for delivery. The append-only rule in migration
 * 0014 protects the event CONTENT; the dispatcher is the single sanctioned
 * exception for delivery metadata, exactly as technical_design/26 §2 requires.
 *
 * Claiming uses `FOR UPDATE SKIP LOCKED` plus a LEASE expressed through
 * `available_at`. There is no CLAIMED status in `domain_event_status`, and
 * adding one would be a migration; instead a claimed row's `available_at` is
 * pushed `leaseMs` into the future and `attempts` is incremented in the SAME
 * statement. A worker killed mid-publish therefore leaves a row that another
 * worker reclaims after the lease, which is the crash-safety property doc 26
 * §13 asks for.
 *
 * Every dynamic value is a bound parameter. The only literals in the SQL are
 * closed enum values from `domain_event_status`.
 */
import { sql } from 'drizzle-orm';

import type { CatalogDatabase } from '../catalog/executor.js';
import { DEFAULT_MAX_ATTEMPTS } from './backoff.js';

export type DomainEventStatus = 'PENDING' | 'PUBLISHED' | 'FAILED' | 'DEAD_LETTER';

/** A row as PostgreSQL returns it. BIGINT arrives as a string through `pg`. */
export interface DomainEventRow extends Record<string, unknown> {
  readonly id: string;
  readonly event_id: string;
  readonly event_type: string;
  readonly aggregate_type: string;
  readonly aggregate_id: string;
  readonly aggregate_version: number | null;
  readonly payload: unknown;
  readonly trace_id: string | null;
  readonly status: DomainEventStatus;
  readonly attempts: number;
  readonly last_error: string | null;
  readonly occurred_at: Date | string;
  readonly available_at: Date | string;
  readonly published_at: Date | string | null;
}

const DOMAIN_EVENT_COLUMNS = sql`
  id, event_id, event_type, aggregate_type, aggregate_id, aggregate_version,
  payload, trace_id, status, attempts, last_error, occurred_at, available_at,
  published_at
`;

export interface ClaimOutboxOptions {
  /** Maximum rows per pass. Clamped to 1..500; the default is 50. */
  readonly limit?: number;
  /** How long a claimed row is invisible to other workers. Default 30s. */
  readonly leaseMs?: number;
}

function clampLimit(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 50;
  return Math.min(Math.max(Math.floor(value), 1), 500);
}

function clampLease(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 30_000;
  return Math.min(Math.max(Math.floor(value), 1_000), 3_600_000);
}

/**
 * Claim up to `limit` due events. Two workers calling this concurrently receive
 * disjoint sets: the inner `FOR UPDATE SKIP LOCKED` cannot hand the same row to
 * both, and the outer UPDATE makes the lease durable in one statement.
 */
export async function claimOutboxBatch(
  db: CatalogDatabase,
  options: ClaimOutboxOptions = {},
): Promise<DomainEventRow[]> {
  const limit = clampLimit(options.limit);
  const leaseMs = clampLease(options.leaseMs);

  const result = await db.execute<DomainEventRow>(sql`
    UPDATE domain_events
       SET attempts = attempts + 1,
           available_at = now() + (${leaseMs} * interval '1 millisecond')
     WHERE id IN (
       SELECT id
         FROM domain_events
        WHERE status IN ('PENDING', 'FAILED')
          AND available_at <= now()
        ORDER BY id
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
     )
    RETURNING ${DOMAIN_EVENT_COLUMNS}
  `);

  return result.rows;
}

export interface MarkPublishedResult {
  readonly id: string;
  readonly publishedAt: Date | string;
}

/**
 * Mark an event delivered. Idempotent: a second call for the same id updates
 * nothing and returns null, so a retried publish is not an error.
 */
export async function markOutboxPublished(
  db: CatalogDatabase,
  eventRowId: string,
): Promise<MarkPublishedResult | null> {
  const result = await db.execute<{ id: string; published_at: Date | string }>(sql`
    UPDATE domain_events
       SET status = 'PUBLISHED',
           published_at = now(),
           last_error = NULL
     WHERE id = ${eventRowId}
       AND status <> 'PUBLISHED'
    RETURNING id, published_at
  `);

  const row = result.rows[0];
  return row === undefined ? null : { id: row.id, publishedAt: row.published_at };
}

export interface MarkFailedOptions {
  readonly eventRowId: string;
  /** A safe, already-redacted description. This module redacts again. */
  readonly error: string;
  /** False for a poison payload: dead-letter on the first attempt. */
  readonly retryable?: boolean;
  /** Delay before the next attempt; ignored when dead-lettering. */
  readonly backoffMs: number;
  readonly maxAttempts?: number;
}

export interface MarkFailedResult {
  readonly id: string;
  readonly status: DomainEventStatus;
  readonly attempts: number;
}

/**
 * Record a failed delivery.
 *
 * `attempts` was incremented at claim time, so `attempts >= maxAttempts` means
 * the attempt that just failed was the last one. A non-retryable failure
 * dead-letters immediately (doc 27 §8: a malformed payload is not retryable).
 */
export async function markOutboxFailed(
  db: CatalogDatabase,
  options: MarkFailedOptions,
): Promise<MarkFailedResult | null> {
  const retryable = options.retryable !== false;
  const maxAttempts =
    options.maxAttempts !== undefined && options.maxAttempts > 0
      ? Math.floor(options.maxAttempts)
      : DEFAULT_MAX_ATTEMPTS;
  const error = redactErrorText(options.error);
  const backoffMs = Math.max(0, Math.floor(options.backoffMs));

  const result = await db.execute<{ id: string; status: DomainEventStatus; attempts: number }>(sql`
    UPDATE domain_events
       SET status = (CASE
             WHEN NOT ${retryable} THEN 'DEAD_LETTER'
             WHEN attempts >= ${maxAttempts} THEN 'DEAD_LETTER'
             ELSE 'FAILED'
           END)::domain_event_status,
           last_error = ${error},
           available_at = CASE
             WHEN ${retryable} AND attempts < ${maxAttempts}
               THEN now() + (${backoffMs} * interval '1 millisecond')
             ELSE available_at
           END
     WHERE id = ${options.eventRowId}
       AND status <> 'PUBLISHED'
    RETURNING id, status, attempts
  `);

  return result.rows[0] ?? null;
}

export interface EventConsumerKey {
  readonly consumerName: string;
  /**
   * `domain_events.id` — the BIGINT identity, NOT the UUID `event_id` column.
   * The schema's `event_consumers.event_id` references the identity, and the
   * two names are a trap worth restating at every call site.
   */
  readonly eventRowId: string;
}

/**
 * Record that a consumer has handled an event.
 *
 * Returns true when this call created the ledger row and false when the
 * consumer had already recorded it. `ON CONFLICT DO NOTHING` makes a duplicate
 * delivery a no-op rather than an error (technical_design/26 §5).
 */
export async function recordEventConsumer(
  db: CatalogDatabase,
  key: EventConsumerKey,
): Promise<boolean> {
  const result = await db.execute<{ consumer_name: string }>(sql`
    INSERT INTO event_consumers (consumer_name, event_id)
    VALUES (${key.consumerName}, ${key.eventRowId}::bigint)
    ON CONFLICT (consumer_name, event_id) DO NOTHING
    RETURNING consumer_name
  `);

  return result.rows.length > 0;
}

/** Whether a consumer already handled an event. */
export async function hasEventConsumer(
  db: CatalogDatabase,
  key: EventConsumerKey,
): Promise<boolean> {
  const result = await db.execute<{ consumer_name: string }>(sql`
    SELECT consumer_name
      FROM event_consumers
     WHERE consumer_name = ${key.consumerName}
       AND event_id = ${key.eventRowId}::bigint
     LIMIT 1
  `);

  return result.rows.length > 0;
}

/**
 * Outbox health for `/admin/outbox/health` (doc 26 §8): how many events are
 * undelivered and how old the oldest is. Read-only.
 */
export async function getOutboxHealth(db: CatalogDatabase): Promise<{
  unpublished: number;
  deadLettered: number;
  oldestUnpublishedAgeMs: number | null;
}> {
  const result = await db.execute<{
    unpublished: number | string;
    dead_lettered: number | string;
    oldest_age_ms: number | string | null;
  }>(sql`
    SELECT
      count(*) FILTER (WHERE status IN ('PENDING', 'FAILED')) AS unpublished,
      count(*) FILTER (WHERE status = 'DEAD_LETTER') AS dead_lettered,
      EXTRACT(EPOCH FROM (now() - min(occurred_at) FILTER (WHERE status IN ('PENDING', 'FAILED'))))
        * 1000 AS oldest_age_ms
      FROM domain_events
  `);

  const row = result.rows[0];
  if (row === undefined) return { unpublished: 0, deadLettered: 0, oldestUnpublishedAgeMs: null };
  return {
    unpublished: Number(row.unpublished ?? 0),
    deadLettered: Number(row.dead_lettered ?? 0),
    oldestUnpublishedAgeMs:
      row.oldest_age_ms === null || row.oldest_age_ms === undefined
        ? null
        : Math.round(Number(row.oldest_age_ms)),
  };
}

/**
 * Dead-letter rows inherit the outbox's no-PII rule (doc 26 §10). A handler's
 * error message is developer text, but a careless throw can interpolate an
 * address, so anything email-shaped is redacted before it reaches the column.
 * Control characters are stripped and the length is capped so a pathological
 * message cannot bloat the row.
 */
export function redactErrorText(value: string, maxLength = 2000): string {
  return value
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex -- matching control characters is the point
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]')
    .slice(0, maxLength);
}
