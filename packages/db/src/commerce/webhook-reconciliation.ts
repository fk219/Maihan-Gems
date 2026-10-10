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
import type { CatalogDatabase } from '../catalog/executor.js';
import type { VerifiedWebhook } from '@maihan/contracts';

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
    SELECT id, order_number, grand_total::text AS grand_total, state::text AS state
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

  const order = orderRes.rows[0] as { id: string; order_number: string; grand_total: string; state: string };

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
    const providerPaymentId =
      verified.providerPaymentId ?? `pay_${verified.provider.toLowerCase()}_${verified.externalEventId}`;

    await db.execute(sql`
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

    // Update order to PAID
    await db.execute(sql`
      UPDATE orders
      SET state = 'PAID', paid_at = now(), updated_at = now()
      WHERE id = ${order.id}
    `);

    // Append to order_events timeline
    await db.execute(sql`
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
    await db.execute(sql`
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
    await db.execute(sql`
      UPDATE webhook_receipts
      SET processed_at = now()
      WHERE provider = ${verified.provider}
        AND external_event_id = ${verified.externalEventId}
    `);

    return { reconciled: true, orderId: order.id };
  }

  // Other events mark processed
  await db.execute(sql`
    UPDATE webhook_receipts
    SET processed_at = now()
    WHERE provider = ${verified.provider}
      AND external_event_id = ${verified.externalEventId}
  `);

  return { reconciled: true, orderId: order.id };
}
