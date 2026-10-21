/**
 * packages/db/src/commerce/webhook-reconciliation.ts
 *
 * Phase 6 Task 6 — Webhook receipt idempotency and payment reconciliation.
 *
 * Authority:
 * - technical_design/13 COMMERCE ARCHITECTURE §104, §258.
 * - technical_design/14 OPERATIONS ARCHITECTURE §93-107.
 * - Rules: Verify HMAC over raw body before parsing. Deduplicate in webhook_receipts.
 *   Re-derive amounts server-side from orders.
 */
import { sql } from 'drizzle-orm';
import { ContractError, type VerifiedWebhook } from '@maihan/contracts';
import type { CatalogDatabase } from '../catalog/executor.js';

export interface WebhookReceiptResult {
  id: number;
  isDuplicate: boolean;
  processedAt: Date | string | null;
}

export async function recordWebhookReceipt(
  db: CatalogDatabase,
  input: {
    provider: string;
    external_event_id: string;
    signature_valid: boolean;
    event_type?: string;
    payload: Record<string, unknown>;
  },
): Promise<WebhookReceiptResult> {
  // Check for duplicate
  const checkRes = await db.execute(sql`
    SELECT id, processed_at
    FROM webhook_receipts
    WHERE provider = ${input.provider}
      AND external_event_id = ${input.external_event_id}
    LIMIT 1
  `);

  if (checkRes.rows.length > 0) {
    const row = checkRes.rows[0] as { id: number; processed_at: Date | string | null };
    return {
      id: row.id,
      isDuplicate: true,
      processedAt: row.processed_at,
    };
  }

  const insertRes = await db.execute(sql`
    INSERT INTO webhook_receipts (
      provider,
      external_event_id,
      signature_valid,
      event_type,
      payload
    ) VALUES (
      ${input.provider},
      ${input.external_event_id},
      ${input.signature_valid},
      ${input.event_type ?? null},
      ${JSON.stringify(input.payload)}::jsonb
    )
    ON CONFLICT (provider, external_event_id)
    DO NOTHING
    RETURNING id, processed_at
  `);

  if (insertRes.rows.length === 0) {
    // Concurrent insert
    const recheck = await db.execute(sql`
      SELECT id, processed_at
      FROM webhook_receipts
      WHERE provider = ${input.provider}
        AND external_event_id = ${input.external_event_id}
      LIMIT 1
    `);
    const row = recheck.rows[0] as { id: number; processed_at: Date | string | null };
    return {
      id: row.id,
      isDuplicate: true,
      processedAt: row.processed_at,
    };
  }

  const newRow = insertRes.rows[0] as { id: number; processed_at: Date | string | null };
  return {
    id: newRow.id,
    isDuplicate: false,
    processedAt: null,
  };
}

export async function reconcilePaymentWebhook(
  db: CatalogDatabase,
  verified: VerifiedWebhook,
): Promise<{ reconciled: boolean; orderId?: string; error?: string }> {
  let targetOrderId = verified.orderId;

  if (!targetOrderId && verified.providerPaymentId) {
    const payRes = await db.execute(sql`
      SELECT order_id
      FROM payments
      WHERE provider = ${verified.provider}
        AND provider_payment_id = ${verified.providerPaymentId}
      LIMIT 1
    `);
    if (payRes.rows.length > 0) {
      targetOrderId = (payRes.rows[0] as { order_id: string }).order_id;
    }
  }

  if (!targetOrderId) {
    await db.execute(sql`
      UPDATE webhook_receipts
      SET processing_error = 'Order reference not found in webhook payload'
      WHERE provider = ${verified.provider}
        AND external_event_id = ${verified.externalEventId}
    `);
    return { reconciled: false, error: 'Order reference not found' };
  }

  // Load authoritative order
  const orderRes = await db.execute(sql`
    SELECT id, order_number, grand_total::text AS grand_total, state::text AS state, version
    FROM orders
    WHERE id = ${targetOrderId}
    LIMIT 1
  `);

  if (orderRes.rows.length === 0) {
    await db.execute(sql`
      UPDATE webhook_receipts
      SET processing_error = ${'Order ' + targetOrderId + ' does not exist'}
      WHERE provider = ${verified.provider}
        AND external_event_id = ${verified.externalEventId}
    `);
    return { reconciled: false, error: 'Order not found' };
  }

  const order = orderRes.rows[0] as {
    id: string;
    order_number: string;
    grand_total: string;
    state: string;
    version: number;
  };

  // Re-derivation amount check
  if (verified.amount && Number(verified.amount).toFixed(2) !== Number(order.grand_total).toFixed(2)) {
    const err = `Amount mismatch: webhook amount ${verified.amount} vs authoritative order grand_total ${order.grand_total}`;
    await db.execute(sql`
      UPDATE webhook_receipts
      SET processing_error = ${err}
      WHERE provider = ${verified.provider}
        AND external_event_id = ${verified.externalEventId}
    `);
    return { reconciled: false, error: err };
  }

  // Handle capture event
  if (verified.eventType === 'payment.captured' || verified.eventType === 'charge.successful') {
    if (order.state === 'PAID') {
      // At-least-once redelivery with a fresh receipt id: already applied.
      return { reconciled: true, orderId: order.id };
    }
    if (order.state !== 'PENDING_PAYMENT') {
      const err = `Cannot mark order ${order.order_number} PAID from state ${order.state}`;
      await db.execute(sql`
        UPDATE webhook_receipts
        SET processing_error = ${err}
        WHERE provider = ${verified.provider}
          AND external_event_id = ${verified.externalEventId}
      `);
      return { reconciled: false, orderId: order.id, error: err };
    }
    const providerPaymentId =
      verified.providerPaymentId ?? `pay_${verified.provider.toLowerCase()}_${verified.externalEventId}`;

    // P1-11: payment row + order PAID + ledger + receipt closure are ONE
    // transaction — a crash between two statements can no longer leave real
    // captured money pointing at a PENDING_PAYMENT order.
    await db.transaction(async (tx) => {
      await tx.execute(sql`
      INSERT INTO payments (
        order_id,
        provider,
        provider_payment_id,
        state,
        amount,
        captured_amount,
        currency,
        captured_at
      ) VALUES (
        ${order.id},
        ${verified.provider},
        ${providerPaymentId},
        'CAPTURED',
        ${order.grand_total}::numeric,
        ${order.grand_total}::numeric,
        ${verified.currency ?? 'USD'},
        now()
      )
      ON CONFLICT (provider_payment_id)
      DO UPDATE SET
        state = 'CAPTURED',
        captured_amount = EXCLUDED.captured_amount,
        captured_at = now(),
        updated_at = now()
    `);

      // Update order to PAID with optimistic concurrency and a state guard.
      const paidRes = await tx.execute(sql`
      UPDATE orders
      SET state = 'PAID', paid_at = now(), updated_at = now(), version = version + 1
      WHERE id = ${order.id}
        AND state = 'PENDING_PAYMENT'
        AND version = ${order.version}
      RETURNING id
    `);
      if (paidRes.rows.length === 0) {
        const err = 'Concurrent order state change detected during payment reconciliation';
        throw new ContractError('IDEMPOTENCY_CONFLICT', err);
      }

      // Append to order_events timeline
      await tx.execute(sql`
      INSERT INTO order_events (
        order_id,
        from_state,
        to_state,
        actor_type,
        reason,
        metadata
      ) VALUES (
        ${order.id},
        ${order.state}::order_state,
        'PAID',
        'WEBHOOK',
        'Payment captured via webhook reconciliation',
        ${JSON.stringify({ external_event_id: verified.externalEventId, provider: verified.provider })}::jsonb
      )
    `);

      // Write audit log
      await tx.execute(sql`
      INSERT INTO audit_logs (
        actor_type,
        action,
        entity_type,
        entity_id,
        after_state,
        reason
      ) VALUES (
        'WEBHOOK',
        'UPDATE',
        'orders',
        ${order.id},
        ${JSON.stringify({ state: 'PAID', provider: verified.provider, grand_total: order.grand_total })}::jsonb,
        'Reconciled captured payment webhook'
      )
    `);

      // Mark webhook receipt processed
      await tx.execute(sql`
      UPDATE webhook_receipts
      SET processed_at = now()
      WHERE provider = ${verified.provider}
        AND external_event_id = ${verified.externalEventId}
    `);
    }).catch(async (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      await db.execute(sql`
      UPDATE webhook_receipts
      SET processing_error = ${message.slice(0, 480)}
      WHERE provider = ${verified.provider}
        AND external_event_id = ${verified.externalEventId}
    `);
      return { reconciled: false, orderId: order.id, error: message } as const;
    });

    return { reconciled: true, orderId: order.id };
  }

  // P1-11 ack-class coverage: state-relevant non-capture events are recorded
  // as visible ack-without-state-change receipts (not silent no-ops) so the
  // reconciliation sweep can distinguish them from handled captures.
  const ackClass = verified.eventType.startsWith('refund') || verified.eventType.startsWith('dispute')
    ? `${verified.eventType}:awaiting_reconciliation_sweep`
    : verified.eventType;
  await db.execute(sql`
    UPDATE webhook_receipts
    SET processed_at = now(),
        processing_error = ${`acknowledged_without_state_change: ${ackClass}`}
    WHERE provider = ${verified.provider}
      AND external_event_id = ${verified.externalEventId}
  `);

  return { reconciled: true, orderId: order.id };
}
