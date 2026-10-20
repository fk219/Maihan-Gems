/**
 * packages/db/src/commerce/payment-repository.ts
 *
 * Phase 6 Task 5 — Payments persistence and state updates.
 *
 * Authority:
 * - technical_design/13 COMMERCE ARCHITECTURE §97-113.
 * - technical_design/04 DATABASE IMPLEMENTATION.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import { ContractError, type PaymentState } from '@maihan/contracts';

export interface PaymentRecordRow {
  id: string;
  order_id: string;
  provider: string;
  provider_payment_id: string;
  state: PaymentState;
  amount: string;
  captured_amount: string;
  refunded_amount: string;
  currency: string;
  method_type: string | null;
  method_last4: string | null;
  failure_code: string | null;
  failure_message: string | null;
  idempotency_key: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  captured_at: Date | string | null;
}

export async function createPaymentRecord(
  db: CatalogDatabase,
  input: {
    order_id: string;
    provider: string;
    provider_payment_id: string;
    amount: string;
    currency?: string;
    state?: PaymentState;
    method_type?: string;
    method_last4?: string;
    idempotency_key?: string;
  },
): Promise<PaymentRecordRow> {
  const currency = input.currency ?? 'USD';
  const state = input.state ?? 'CREATED';

  const res = await db.execute(sql`
    INSERT INTO payments (
      order_id,
      provider,
      provider_payment_id,
      state,
      amount,
      currency,
      method_type,
      method_last4,
      idempotency_key
    ) VALUES (
      ${input.order_id},
      ${input.provider},
      ${input.provider_payment_id},
      ${state}::payment_state,
      ${input.amount}::numeric,
      ${currency},
      ${input.method_type ?? null},
      ${input.method_last4 ?? null},
      ${input.idempotency_key ?? null}
    )
    RETURNING
      id,
      order_id,
      provider,
      provider_payment_id,
      state::text AS state,
      amount::text AS amount,
      captured_amount::text AS captured_amount,
      refunded_amount::text AS refunded_amount,
      currency,
      method_type,
      method_last4,
      failure_code,
      failure_message,
      idempotency_key,
      created_at,
      updated_at,
      captured_at
  `);

  return res.rows[0] as unknown as PaymentRecordRow;
}

export async function getPaymentById(
  db: CatalogDatabase,
  paymentId: string,
): Promise<PaymentRecordRow | null> {
  const res = await db.execute(sql`
    SELECT
      id,
      order_id,
      provider,
      provider_payment_id,
      state::text AS state,
      amount::text AS amount,
      captured_amount::text AS captured_amount,
      refunded_amount::text AS refunded_amount,
      currency,
      method_type,
      method_last4,
      failure_code,
      failure_message,
      idempotency_key,
      created_at,
      updated_at,
      captured_at
    FROM payments
    WHERE id = ${paymentId}
    LIMIT 1
  `);
  if (res.rows.length === 0) return null;
  return res.rows[0] as unknown as PaymentRecordRow;
}

export async function getPaymentByProviderPaymentId(
  db: CatalogDatabase,
  provider: string,
  providerPaymentId: string,
): Promise<PaymentRecordRow | null> {
  const res = await db.execute(sql`
    SELECT
      id,
      order_id,
      provider,
      provider_payment_id,
      state::text AS state,
      amount::text AS amount,
      captured_amount::text AS captured_amount,
      refunded_amount::text AS refunded_amount,
      currency,
      method_type,
      method_last4,
      failure_code,
      failure_message,
      idempotency_key,
      created_at,
      updated_at,
      captured_at
    FROM payments
    WHERE provider = ${provider}
      AND provider_payment_id = ${providerPaymentId}
    LIMIT 1
  `);

  if (res.rows.length === 0) return null;
  return res.rows[0] as unknown as PaymentRecordRow;
}

export async function updatePaymentState(
  db: CatalogDatabase,
  paymentId: string,
  newState: PaymentState,
  options: {
    capturedAmount?: string;
    refundedAmount?: string;
    failureCode?: string;
    failureMessage?: string;
  } = {},
): Promise<PaymentRecordRow> {
  const res = await db.execute(sql`
    UPDATE payments
    SET state = ${newState}::payment_state,
        captured_amount = COALESCE(${options.capturedAmount ? `${options.capturedAmount}::numeric` : null}, captured_amount),
        refunded_amount = COALESCE(${options.refundedAmount ? `${options.refundedAmount}::numeric` : null}, refunded_amount),
        failure_code = COALESCE(${options.failureCode ?? null}, failure_code),
        failure_message = COALESCE(${options.failureMessage ?? null}, failure_message),
        captured_at = CASE WHEN ${newState} = 'CAPTURED' AND captured_at IS NULL THEN now() ELSE captured_at END,
        updated_at = now()
    WHERE id = ${paymentId}
    RETURNING
      id,
      order_id,
      provider,
      provider_payment_id,
      state::text AS state,
      amount::text AS amount,
      captured_amount::text AS captured_amount,
      refunded_amount::text AS refunded_amount,
      currency,
      method_type,
      method_last4,
      failure_code,
      failure_message,
      idempotency_key,
      created_at,
      updated_at,
      captured_at
  `);

  if (res.rows.length === 0) {
    throw new ContractError('NOT_FOUND', `Payment with ID "${paymentId}" not found.`);
  }

  return res.rows[0] as unknown as PaymentRecordRow;
}
