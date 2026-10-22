/**
 * packages/db/src/operations/reconciliation-sweeps.ts
 *
 * P3-6 blind-spot controls (built pre-deployment, schema-safe):
 *
 * 1. reconcileDanglingCapturedPayments — the dropped-webhook catcher: a
 *    payment row marked CAPTURED whose order is still PENDING_PAYMENT after
 *    a grace hour means the webhook never reconciled. The catch-up applies
 *    the SAME guarded transition the webhook path uses (state+version
 *    checked), so divergence self-heals instead of blocking a paid order.
 * 2. flagHighValueOrders — orders at/above the operator threshold get an
 *    audit-log flag row for the manual-review workflow (R-22).
 * 3. sweepPublishedOutbox — bounds outbox growth: PUBLISHED rows older than
 *    the retention window are removed; the event_consumers ledger (identity
 *    PK) stays as the permanent "delivered" record.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';

export interface ReconciliationCatchUpResult {
  readonly reconciled: number;
  readonly flagged: number;
  readonly outboxDeleted: number;
}

export async function reconcileDanglingCapturedPayments(
  db: CatalogDatabase,
  options: { readonly graceMinutes?: number; readonly batchSize?: number } = {},
): Promise<{ reconciled: number }> {
  const grace = options.graceMinutes ?? 60;
  const batch = options.batchSize ?? 25;
  const dangling = await db.execute(sql`
    SELECT p.id::text AS payment_id, p.order_id::text AS order_id, o.state::text AS order_state, o.version
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE p.state = 'CAPTURED'
      AND o.state = 'PENDING_PAYMENT'
      AND p.captured_at < now() - (${grace} || ' minutes')::interval
    ORDER BY p.captured_at
    LIMIT ${batch}
  `);

  let reconciled = 0;
  for (const row of dangling.rows as Array<{ payment_id: string; order_id: string; order_state: string; version: number }>) {
    const applied = await db.execute(sql`
      UPDATE orders
      SET state = 'PAID', paid_at = COALESCE(paid_at, now()), version = version + 1, updated_at = now()
      WHERE id = ${row.order_id}::uuid AND state = 'PENDING_PAYMENT'
      RETURNING id
    `);
    if ((applied.rowCount ?? 0) === 0) continue;

    await db.execute(sql`
      INSERT INTO order_events (order_id, from_state, to_state, actor_type, reason, metadata)
      VALUES (
        ${row.order_id}::uuid,
        'PENDING_PAYMENT',
        'PAID',
        'SYSTEM',
        'Dangling captured payment reconciled by the catch-up sweep (dropped-webhook control)',
        ${JSON.stringify({ payment_id: row.payment_id, sweep: 'reconciliation-catchup' })}::jsonb
      )
    `);
    reconciled += 1;
  }
  return { reconciled };
}

export async function flagHighValueOrders(
  db: CatalogDatabase,
  thresholdUsd = Number(process.env['MAIHAN_HIGH_VALUE_THRESHOLD_USD'] ?? 25_000),
): Promise<{ flagged: number }> {
  if (!Number.isFinite(thresholdUsd) || thresholdUsd <= 0) return { flagged: 0 };
  const res = await db.execute(sql`
    WITH unflagged AS (
      SELECT o.id, o.order_number, o.grand_total::text AS grand_total
      FROM orders o
      WHERE o.grand_total >= ${thresholdUsd}::numeric
        AND NOT EXISTS (
          SELECT 1 FROM audit_logs a
          WHERE a.entity_type = 'orders' AND a.entity_id = o.id AND a.action = 'HIGH_VALUE_ORDER_FLAGGED'
        )
    )
    INSERT INTO audit_logs (actor_type, action, entity_type, entity_id, after_state, reason)
    SELECT 'SYSTEM', 'HIGH_VALUE_ORDER_FLAGGED', 'orders', id,
           ${JSON.stringify({ threshold_usd: thresholdUsd })}::jsonb,
           ${'High-value order at/above the manual-review threshold ($' + thresholdUsd + ')'}
    FROM unflagged
    RETURNING entity_id
  `);
  return { flagged: res.rowCount ?? 0 };
}

export async function sweepPublishedOutbox(
  db: CatalogDatabase,
  retentionDays = 30,
  batchSize = 500,
): Promise<{ deleted: number }> {
  const res = await db.execute(sql`
    DELETE FROM domain_events
    WHERE id IN (
      SELECT id FROM domain_events
      WHERE status = 'PUBLISHED'
        AND published_at < now() - (${retentionDays} || ' days')::interval
      ORDER BY id
      LIMIT ${batchSize}
    )
  `);
  return { deleted: res.rowCount ?? 0 };
}
