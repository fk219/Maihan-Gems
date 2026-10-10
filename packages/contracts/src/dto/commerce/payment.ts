/**
 * packages/contracts/src/dto/commerce/payment.ts
 *
 * Phase 6 Task 5 — Provider-neutral payment interface contracts.
 *
 * Authority:
 * - technical_design/13 COMMERCE ARCHITECTURE §97-113.
 * - Charter Section 16: No provider SDK appears in domain or application code.
 * - Payment provider is [UNKNOWN]; exactly one test adapter ships in Phase 6.
 */
import { z } from 'zod';

export const PaymentStateSchema = z.enum([
  'CREATED',
  'AUTHORIZED',
  'CAPTURED',
  'FAILED',
  'VOIDED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
]);
export type PaymentState = z.infer<typeof PaymentStateSchema>;

export const PaymentAuthorizeInputSchema = z
  .object({
    order_id: z.string().uuid(),
    order_number: z.string(),
    amount: z.string().regex(/^\d+\.\d{2}$/),
    currency: z.string().length(3).default('USD'),
    method_type: z.string().default('TEST'),
    method_last4: z.string().length(4).optional(),
    idempotency_key: z.string().optional(),
  })
  .strict();
export type PaymentAuthorizeInput = z.infer<typeof PaymentAuthorizeInputSchema>;

export const PaymentAuthorizeResultSchema = z
  .object({
    provider: z.string(),
    provider_payment_id: z.string(),
    state: z.literal('AUTHORIZED'),
    amount: z.string().regex(/^\d+\.\d{2}$/),
    currency: z.string().length(3),
    authorized_at: z.string(),
  })
  .strict();
export type PaymentAuthorizeResult = z.infer<typeof PaymentAuthorizeResultSchema>;

export const PaymentCaptureInputSchema = z
  .object({
    order_id: z.string().uuid(),
    provider_payment_id: z.string(),
    amount: z.string().regex(/^\d+\.\d{2}$/),
    currency: z.string().length(3).default('USD'),
    idempotency_key: z.string().optional(),
  })
  .strict();
export type PaymentCaptureInput = z.infer<typeof PaymentCaptureInputSchema>;

export const PaymentCaptureResultSchema = z
  .object({
    provider: z.string(),
    provider_payment_id: z.string(),
    state: z.literal('CAPTURED'),
    captured_amount: z.string().regex(/^\d+\.\d{2}$/),
    currency: z.string().length(3),
    captured_at: z.string(),
  })
  .strict();
export type PaymentCaptureResult = z.infer<typeof PaymentCaptureResultSchema>;

export const PaymentRefundInputSchema = z
  .object({
    order_id: z.string().uuid(),
    provider_payment_id: z.string(),
    amount: z.string().regex(/^\d+\.\d{2}$/),
    currency: z.string().length(3).default('USD'),
    reason: z.string().min(1),
    idempotency_key: z.string().optional(),
  })
  .strict();
export type PaymentRefundInput = z.infer<typeof PaymentRefundInputSchema>;

export const PaymentRefundResultSchema = z
  .object({
    provider: z.string(),
    provider_payment_id: z.string(),
    provider_refund_id: z.string(),
    refunded_amount: z.string().regex(/^\d+\.\d{2}$/),
    currency: z.string().length(3),
    refunded_at: z.string(),
  })
  .strict();
export type PaymentRefundResult = z.infer<typeof PaymentRefundResultSchema>;

export interface RawWebhookRequest {
  readonly rawBody: string | Buffer;
  readonly headers: Record<string, string | string[] | undefined>;
}

export interface VerifiedWebhook {
  readonly isValid: boolean;
  readonly provider: string;
  readonly externalEventId: string;
  readonly eventType: string;
  readonly orderId?: string;
  readonly providerPaymentId?: string;
  readonly amount?: string;
  readonly currency?: string;
  readonly timestamp: string;
  readonly rawPayload: Record<string, unknown>;
  readonly signatureError?: string;
}

export interface PaymentProvider {
  readonly providerName: string;
  authorize(input: PaymentAuthorizeInput): Promise<PaymentAuthorizeResult>;
  capture(input: PaymentCaptureInput): Promise<PaymentCaptureResult>;
  refund(input: PaymentRefundInput): Promise<PaymentRefundResult>;
  verifyWebhook(req: RawWebhookRequest, secret?: string): VerifiedWebhook;
}
