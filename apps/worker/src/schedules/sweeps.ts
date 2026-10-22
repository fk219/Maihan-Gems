/**
 * apps/worker/src/schedules/sweeps.ts
 *
 * Scheduled sweeps (cron-equivalent). Every sweep is idempotent: running it
 * twice in a row changes nothing the second time.
 *
 *  - reservations: release expired inventory reservations (packages/db's
 *    sweepExpiredReservations — writes release events to the outbox, so the
 *    dispatcher publishes them on the next tick).
 *  - checkoutSessions: expire stale checkout sessions whose reservation
 *    window passed and are still not COMPLETED.
 *  - carts: expire carts past their expires_at.
 *  - webhookReceipts: bounded accounting for unrecoverable webhook
 *    processing failures — after WEBHOOK_MAX_FAILURES the receipt is marked
 *    FAILED for the admin ops view. Re-execution without a fresh verified
 *    signature is deliberately NOT attempted (security: no replay without
 *    verification).
 */
import {
  flagHighValueOrders,
  reconcileDanglingCapturedPayments,
  sql,
  sweepExpiredReservations,
  sweepPublishedOutbox,
} from '@maihan/db';

import type { CatalogDatabase } from '../dispatch/catalog-db.js';

export interface SweepResult {
  name: string;
  changed: number;
  detail?: string;
}

export async function sweepReservations(db: CatalogDatabase): Promise<SweepResult> {
  const released = await sweepExpiredReservations(db);
  return { name: 'reservations', changed: released.length };
}

export async function sweepCheckoutSessions(db: CatalogDatabase): Promise<SweepResult> {
  // Checkout sessions live in the normalized `checkout_sessions` table
  // (ADR-027). Expiry marks them CANCELLED — the same state the read path
  // treats as expired (CHECKOUT_SESSION_EXPIRED).
  const res = await db.execute(sql`
    UPDATE checkout_sessions
    SET state = 'CANCELLED', updated_at = now()
    WHERE state = 'ACTIVE'
      AND reservation_expires_at IS NOT NULL
      AND reservation_expires_at < now()
  `);
  return { name: 'checkout-sessions', changed: res.rowCount ?? 0 };
}

export async function sweepCarts(db: CatalogDatabase): Promise<SweepResult> {
  const res = await db.execute(sql`
    UPDATE carts
    SET state = 'EXPIRED', updated_at = now()
    WHERE state = 'ACTIVE' AND expires_at < now()
  `);
  return { name: 'carts', changed: res.rowCount ?? 0 };
}

export const EXHAUSTION_MARKER = ' [retries exhausted; manual review required]';

export async function sweepWebhookReceipts(db: CatalogDatabase): Promise<SweepResult> {
  // Bounded failure accounting: failed receipts that are older than an hour
  // get the exhaustion marker ONCE for the admin ops view (never deleted,
  // never replayed unsigned). Idempotent: exhausted receipts match no
  // further predicate.
  const res = await db.execute(sql`
    UPDATE webhook_receipts
    SET processing_error = processing_error || ${EXHAUSTION_MARKER}
    WHERE processed_at IS NULL
      AND processing_error IS NOT NULL
      AND processing_error NOT LIKE '%retries exhausted%'
      AND received_at < now() - interval '1 hour'
  `);
  return {
    name: 'webhook-receipts',
    changed: res.rowCount ?? 0,
    detail: 'exhausted receipts flagged for admin review (no unsigned replay)',
  };
}

export async function runSweeps(db: CatalogDatabase): Promise<SweepResult[]> {
  const [dangling, highValue, outbox] = await Promise.all([
    reconcileDanglingCapturedPayments(db),
    flagHighValueOrders(db),
    sweepPublishedOutbox(db),
  ]);
  return [
    await sweepReservations(db),
    await sweepCheckoutSessions(db),
    await sweepCarts(db),
    await sweepWebhookReceipts(db),
    await sweepJobsRetention(db),
    {
      name: 'reconciliation-catchup',
      changed: dangling.reconciled,
      detail: 'dangling captured payments → guarded PAID transition (dropped-webhook control)',
    },
    {
      name: 'high-value-flags',
      changed: highValue.flagged,
      detail: 'orders at/above the manual-review threshold flagged to audit',
    },
    {
      name: 'outbox-growth',
      changed: outbox.deleted,
      detail: 'PUBLISHED outbox rows past retention deleted (consumer ledger persists)',
    },
  ];
}

/**
 * P1-28 jobs retention (doc 27 §1: the operational `jobs` table is 90-day
 * transient state — terminal rows (SUCCEEDED / DEAD_LETTER with their result
 * payloads, including email copies) older than the window are removed).
 * Terminal rows only: QUEUED/RUNNING/FAILED entries are never swept here —
 * claim lease and retry state protect those.
 */
export async function sweepJobsRetention(db: CatalogDatabase): Promise<SweepResult> {
  const res = await db.execute(sql`
    DELETE FROM jobs
    WHERE state IN ('SUCCEEDED', 'DEAD_LETTER')
      AND (updated_at < now() - interval '90 days'
           OR (state = 'SUCCEEDED' AND finished_at IS NOT NULL AND finished_at < now() - interval '90 days'))
  `);
  return {
    name: 'jobs-retention',
    changed: res.rowCount ?? 0,
    detail: '90-day terminal-jobs retention sweep (doc 27)',
  };
}
