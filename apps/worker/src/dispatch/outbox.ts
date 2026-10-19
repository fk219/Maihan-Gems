/**
 * apps/worker/src/dispatch/outbox.ts
 *
 * Transactional-outbox dispatcher (ADR-020 / technical_design/26).
 *
 * Claims PENDING `domain_events` with FOR UPDATE SKIP LOCKED (multiple
 * workers never double-publish), marks them PUBLISHED, and records the
 * dispatch in `event_consumers` (idempotent consumption). Failures increment
 * `attempts`, set `last_error`, and schedule an exponential backoff via
 * `available_at`; after MAX_ATTEMPTS the event is DEAD_LETTERED — visible to
 * admin ops, never silently dropped.
 */
import { sql } from '@maihan/db';

import type { CatalogDatabase } from './catalog-db.js';

export const MAX_OUTBOX_ATTEMPTS = 5;

export interface OutboxDispatchResult {
  published: number;
  retried: number;
  deadLettered: number;
}

export async function dispatchOutbox(
  db: CatalogDatabase,
  consumerName = 'worker-outbox-dispatcher',
): Promise<OutboxDispatchResult> {
  const result: OutboxDispatchResult = { published: 0, retried: 0, deadLettered: 0 };

  // The loop terminates when a claim attempt returns no rows. Each pass
  // claims one batch so a long failure list cannot starve publishing.
  for (;;) {
    const claimed = await db.execute(sql`
      UPDATE domain_events
      SET attempts = attempts + 1
      WHERE id IN (
        SELECT id
          FROM domain_events
         WHERE status = 'PENDING' AND available_at <= now()
         ORDER BY occurred_at ASC
         LIMIT 25
         FOR UPDATE SKIP LOCKED
      )
      RETURNING id, event_id, event_type, aggregate_type, aggregate_id, attempts
    `);
    const rows = claimed.rows as Array<{
      id: string;
      event_id: string;
      event_type: string;
      aggregate_type: string;
      aggregate_id: string;
      attempts: number;
    }>;
    if (rows.length === 0) break;

    for (const row of rows) {
      try {
        // Publication + consumer ledger are ONE atomic unit: the event is
        // marked PUBLISHED and recorded as consumed by this dispatcher
        // together, so a crash between the two cannot double-publish.
        await db.transaction(async (tx) => {
          await tx.execute(sql`
            UPDATE domain_events
            SET status = 'PUBLISHED', published_at = now(), last_error = NULL
            WHERE id = ${row.id} AND status = 'PENDING'
          `);
          await tx.execute(sql`
            INSERT INTO event_consumers (consumer_name, event_id, processed_at)
            VALUES (${consumerName}, ${row.id}, now())
            ON CONFLICT (consumer_name, event_id) DO NOTHING
          `);
        });
        result.published += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const attempts = Number(row.attempts);
        if (attempts >= MAX_OUTBOX_ATTEMPTS) {
          await db.execute(sql`
            UPDATE domain_events
            SET status = 'DEAD_LETTER', last_error = ${message}
            WHERE id = ${row.id} AND status = 'PENDING'
          `);
          result.deadLettered += 1;
        } else {
          const backoffSeconds = Math.min(3600, 2 ** attempts * 5);
          await db.execute(sql`
            UPDATE domain_events
            SET status = 'PENDING', last_error = ${message}, available_at = now() + (${backoffSeconds} || ' seconds')::interval
            WHERE id = ${row.id} AND status = 'PENDING'
          `);
          result.retried += 1;
        }
      }
    }
  }

  return result;
}
