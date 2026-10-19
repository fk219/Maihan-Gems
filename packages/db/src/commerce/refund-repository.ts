/**
 * packages/db/src/commerce/refund-repository.ts
 *
 * Phase 6 Task 11 — Refund request and approval workflow repository.
 *
 * Authority:
 * - technical_design/13 COMMERCE ARCHITECTURE §Refunds.
 * - Invariant: Bounds check amount <= captured_amount (REFUND_EXCEEDS_CAPTURED).
 * - State machine: REQUESTED -> APPROVED -> SUCCEEDED | REJECTED.
 * - Immutable original order snapshots: partial refunds create new rows and never edit original order pricing.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import {
  ContractError,
  type RefundDto,
  type RefundState,
} from '@maihan/contracts';

interface RefundRow {
  id: string;
  payment_id: string;
  order_id: string;
  amount: string;
  currency: string;
  reason: string;
  state: RefundState;
  provider_refund_id: string | null;
  requested_by: string | null;
  approved_by: string | null;
  requested_at: string;
  processed_at: string | null;
}

function mapRefundRow(row: RefundRow): RefundDto {
  return {
    id: row.id,
    payment_id: row.payment_id,
    order_id: row.order_id,
    amount: Number(row.amount).toFixed(2),
    currency: row.currency,
    reason: row.reason,
    state: row.state,
    provider_refund_id: row.provider_refund_id,
    requested_by: row.requested_by,
    approved_by: row.approved_by,
    requested_at: new Date(row.requested_at).toISOString(),
    processed_at: row.processed_at ? new Date(row.processed_at).toISOString() : null,
  };
}

async function runInTransaction<T>(
  db: CatalogDatabase,
  work: (tx: CatalogDatabase) => Promise<T>,
): Promise<T> {
  const maybeTx = (
    db as unknown as {
      transaction?: <R>(fn: (tx: CatalogDatabase) => Promise<R>) => Promise<R>;
    }
  ).transaction;
  if (typeof maybeTx === 'function') {
    return (await maybeTx.call(db, work)) as T;
  }
  return work(db);
}

export async function requestRefund(
  db: CatalogDatabase,
  input: {
    orderId: string;
    amount: number;
    reason: string;
    requested_by?: string;
  },
): Promise<RefundDto> {
  return runInTransaction(db, async (tx) => {
  // 1. Fetch order and lock captured payment row FOR UPDATE to prevent concurrent over-refund races
  const orderRes = await tx.execute(sql`
    SELECT id, order_number, state::text AS state
    FROM orders
    WHERE id = ${input.orderId} OR order_number = ${input.orderId}
    LIMIT 1
  `);

  if (orderRes.rows.length === 0) {
    throw new ContractError('ORDER_NOT_FOUND', `Order "${input.orderId}" not found.`);
  }

  const order = orderRes.rows[0] as { id: string; order_number: string; state: string };

  const paymentRes = await tx.execute(sql`
    SELECT
      id,
      amount::text AS amount,
      captured_amount::text AS captured_amount,
      refunded_amount::text AS refunded_amount,
      currency,
      state::text AS state
    FROM payments
    WHERE order_id = ${order.id}
      AND state IN ('CAPTURED', 'PARTIALLY_REFUNDED', 'REFUNDED')
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE
  `);

  if (paymentRes.rows.length === 0) {
    throw new ContractError('UNPROCESSABLE', 'Order does not have a captured payment to refund.');
  }

  const payment = paymentRes.rows[0] as {
    id: string;
    amount: string;
    captured_amount: string;
    refunded_amount: string;
    currency: string;
    state: string;
  };

  const capturedAmount = Number(payment.captured_amount);
  const alreadyRefunded = Number(payment.refunded_amount);

  // Check sum of already requested/approved pending refunds
  const pendingRefundsRes = await tx.execute(sql`
    SELECT COALESCE(SUM(amount), 0)::text AS pending_total
    FROM refunds
    WHERE payment_id = ${payment.id}
      AND state IN ('REQUESTED', 'APPROVED', 'PROCESSING')
  `);

  const pendingRefunded = Number((pendingRefundsRes.rows[0] as { pending_total: string }).pending_total);
  const remainingCapturable = capturedAmount - (alreadyRefunded + pendingRefunded);

  if (input.amount <= 0 || input.amount > remainingCapturable) {
    throw new ContractError(
      'REFUND_EXCEEDS_CAPTURED',
      `Requested refund amount ($${input.amount.toFixed(2)}) exceeds remaining captured amount ($${Math.max(0, remainingCapturable).toFixed(2)}).`,
    );
  }

  // 2. Insert into refunds
  const refundRes = await tx.execute(sql`
    INSERT INTO refunds (
      payment_id,
      order_id,
      amount,
      currency,
      reason,
      state,
      requested_by
    ) VALUES (
      ${payment.id},
      ${order.id},
      ${input.amount},
      ${payment.currency},
      ${input.reason},
      'REQUESTED',
      ${input.requested_by ?? null}
    )
    RETURNING
      id,
      payment_id,
      order_id,
      amount::text AS amount,
      currency,
      reason,
      state::text AS state,
      provider_refund_id,
      requested_by,
      approved_by,
      requested_at,
      processed_at
  `);

  const createdRefund = mapRefundRow(refundRes.rows[0] as unknown as RefundRow);

  // 3. Log event to order_events
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
      ${order.state},
      ${order.state},
      'CUSTOMER',
      ${`Refund requested: $${input.amount.toFixed(2)} (${input.reason})`},
      ${JSON.stringify({ refund_id: createdRefund.id, amount: input.amount, reason: input.reason })}::jsonb
    )
  `);

  return createdRefund;
  });
}

export async function approveRefund(
  db: CatalogDatabase,
  input: {
    refundId: string;
    approved_by?: string;
  },
): Promise<RefundDto> {
  const checkRes = await db.execute(sql`
    SELECT id, order_id, state::text AS state, amount::text AS amount
    FROM refunds
    WHERE id = ${input.refundId}
    LIMIT 1
  `);

  if (checkRes.rows.length === 0) {
    throw new ContractError('NOT_FOUND', `Refund "${input.refundId}" not found.`);
  }

  const existing = checkRes.rows[0] as { id: string; order_id: string; state: string; amount: string };
  if (existing.state !== 'REQUESTED') {
    throw new ContractError('UNPROCESSABLE', `Cannot approve refund in "${existing.state}" state.`);
  }

  const updateRes = await db.execute(sql`
    UPDATE refunds
    SET state = 'APPROVED',
        approved_by = ${input.approved_by ?? null}
    WHERE id = ${input.refundId}
    RETURNING
      id,
      payment_id,
      order_id,
      amount::text AS amount,
      currency,
      reason,
      state::text AS state,
      provider_refund_id,
      requested_by,
      approved_by,
      requested_at,
      processed_at
  `);

  const updatedRefund = mapRefundRow(updateRes.rows[0] as unknown as RefundRow);

  await db.execute(sql`
    INSERT INTO order_events (
      order_id,
      from_state,
      to_state,
      actor_type,
      reason,
      metadata
    ) VALUES (
      ${existing.order_id},
      'PAID',
      'PAID',
      'ADMIN',
      ${`Refund approved: $${existing.amount}`},
      ${JSON.stringify({ refund_id: existing.id, approved_by: input.approved_by ?? null })}::jsonb
    )
  `);

  return updatedRefund;
}

export async function rejectRefund(
  db: CatalogDatabase,
  input: {
    refundId: string;
    reason?: string;
  },
): Promise<RefundDto> {
  const checkRes = await db.execute(sql`
    SELECT id, order_id, state::text AS state
    FROM refunds
    WHERE id = ${input.refundId}
    LIMIT 1
  `);

  if (checkRes.rows.length === 0) {
    throw new ContractError('NOT_FOUND', `Refund "${input.refundId}" not found.`);
  }

  const existing = checkRes.rows[0] as { id: string; order_id: string; state: string };
  if (existing.state !== 'REQUESTED') {
    throw new ContractError('UNPROCESSABLE', `Cannot reject refund in "${existing.state}" state.`);
  }

  const updateRes = await db.execute(sql`
    UPDATE refunds
    SET state = 'REJECTED',
        reason = COALESCE(${input.reason ?? null}, reason)
    WHERE id = ${input.refundId}
    RETURNING
      id,
      payment_id,
      order_id,
      amount::text AS amount,
      currency,
      reason,
      state::text AS state,
      provider_refund_id,
      requested_by,
      approved_by,
      requested_at,
      processed_at
  `);

  const updatedRefund = mapRefundRow(updateRes.rows[0] as unknown as RefundRow);

  await db.execute(sql`
    INSERT INTO order_events (
      order_id,
      from_state,
      to_state,
      actor_type,
      reason,
      metadata
    ) VALUES (
      ${existing.order_id},
      'PAID',
      'PAID',
      'ADMIN',
      ${`Refund rejected: ${input.reason ?? 'Request rejected by merchant'}`},
      ${JSON.stringify({ refund_id: existing.id })}::jsonb
    )
  `);

  return updatedRefund;
}

export async function executeRefund(
  db: CatalogDatabase,
  refundId: string,
  providerRefundId?: string,
): Promise<RefundDto> {
  const checkRes = await db.execute(sql`
    SELECT
      r.id,
      r.payment_id,
      r.order_id,
      r.amount::text AS amount,
      r.state::text AS state,
      p.captured_amount::text AS captured_amount,
      p.refunded_amount::text AS current_refunded_amount,
      o.state::text AS order_state
    FROM refunds r
    JOIN payments p ON p.id = r.payment_id
    JOIN orders o ON o.id = r.order_id
    WHERE r.id = ${refundId}
    LIMIT 1
  `);

  if (checkRes.rows.length === 0) {
    throw new ContractError('NOT_FOUND', `Refund "${refundId}" not found.`);
  }

  const row = checkRes.rows[0] as {
    id: string;
    payment_id: string;
    order_id: string;
    amount: string;
    state: string;
    captured_amount: string;
    current_refunded_amount: string;
    order_state: string;
  };

  if (row.state !== 'APPROVED' && row.state !== 'PROCESSING') {
    throw new ContractError('UNPROCESSABLE', `Cannot execute refund in "${row.state}" state.`);
  }

  const refundAmount = Number(row.amount);
  const newRefundedTotal = Number(row.current_refunded_amount) + refundAmount;
  const isFullyRefunded = newRefundedTotal >= Number(row.captured_amount);

  const newPaymentState = isFullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
  const newOrderState = isFullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

  const refProviderId = providerRefundId ?? `re_test_${Date.now()}`;

  // 1. Update refund
  const refundUpdateRes = await db.execute(sql`
    UPDATE refunds
    SET state = 'SUCCEEDED',
        provider_refund_id = ${refProviderId},
        processed_at = now()
    WHERE id = ${refundId}
    RETURNING
      id,
      payment_id,
      order_id,
      amount::text AS amount,
      currency,
      reason,
      state::text AS state,
      provider_refund_id,
      requested_by,
      approved_by,
      requested_at,
      processed_at
  `);

  // 2. Update payment
  await db.execute(sql`
    UPDATE payments
    SET refunded_amount = ${newRefundedTotal.toFixed(2)},
        state = ${newPaymentState},
        updated_at = now()
    WHERE id = ${row.payment_id}
  `);

  // 3. Update order state
  await db.execute(sql`
    UPDATE orders
    SET state = ${newOrderState},
        version = version + 1,
        updated_at = now()
    WHERE id = ${row.order_id}
  `);

  // 4. Log event
  await db.execute(sql`
    INSERT INTO order_events (
      order_id,
      from_state,
      to_state,
      actor_type,
      reason,
      metadata
    ) VALUES (
      ${row.order_id},
      ${row.order_state},
      ${newOrderState},
      'SYSTEM',
      ${`Refund processed: $${row.amount} (${refProviderId})`},
      ${JSON.stringify({ refund_id: refundId, provider_refund_id: refProviderId, amount: row.amount })}::jsonb
    )
  `);

  return mapRefundRow(refundUpdateRes.rows[0] as unknown as RefundRow);
}

export async function getOrderRefunds(
  db: CatalogDatabase,
  orderId: string,
): Promise<RefundDto[]> {
  const res = await db.execute(sql`
    SELECT
      r.id,
      r.payment_id,
      r.order_id,
      r.amount::text AS amount,
      r.currency,
      r.reason,
      r.state::text AS state,
      r.provider_refund_id,
      r.requested_by,
      r.approved_by,
      r.requested_at,
      r.processed_at
    FROM refunds r
    JOIN orders o ON o.id = r.order_id
    WHERE r.order_id = ${orderId} OR o.order_number = ${orderId}
    ORDER BY r.requested_at DESC
  `);

  return (res.rows as unknown as RefundRow[]).map(mapRefundRow);
}

export async function getRefund(
  db: CatalogDatabase,
  refundId: string,
): Promise<RefundDto> {
  const res = await db.execute(sql`
    SELECT
      id,
      payment_id,
      order_id,
      amount::text AS amount,
      currency,
      reason,
      state::text AS state,
      provider_refund_id,
      requested_by,
      approved_by,
      requested_at,
      processed_at
    FROM refunds
    WHERE id = ${refundId}
    LIMIT 1
  `);

  if (res.rows.length === 0) {
    throw new ContractError('NOT_FOUND', `Refund "${refundId}" not found.`);
  }

  return mapRefundRow(res.rows[0] as unknown as RefundRow);
}
