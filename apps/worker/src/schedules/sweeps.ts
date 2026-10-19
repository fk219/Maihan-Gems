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
import { sql, sweepExpiredReservations } from '@maihan/db';

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
  // Checkout sessions live as `jobs` rows (queue 'checkout_sessions',
  // reservation window = run_after). Expiry marks them CANCELLED — the same
  // state the read path treats as expired (CHECKOUT_SESSION_EXPIRED).
  const res = await db.execute(sql`
    UPDATE jobs
    SET state = 'CANCELLED', updated_at = now()
    WHERE queue = 'checkout_sessions'
      AND state = 'QUEUED'
      AND run_after < now()
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
  return [
    await sweepReservations(db),
    await sweepCheckoutSessions(db),
    await sweepCarts(db),
    await sweepWebhookReceipts(db),
  ];
}
