/**
 * packages/contracts/src/dto/commerce/refund.ts
 *
 * Phase 6 Task 11 — Refund request and approval workflow contracts.
 * Authority: technical_design/13 COMMERCE ARCHITECTURE §Refunds.
 */
import { z } from 'zod';

export const RefundStateSchema = z.enum([
  'REQUESTED',
  'APPROVED',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'REJECTED',
]);
export type RefundState = z.infer<typeof RefundStateSchema>;

export const RefundDtoSchema = z
  .object({
    id: z.string().uuid(),
    payment_id: z.string().uuid(),
    order_id: z.string().uuid(),
    amount: z.string().regex(/^\d+\.\d{2}$/),
    currency: z.string().length(3).default('USD'),
    reason: z.string(),
    state: RefundStateSchema,
    provider_refund_id: z.string().nullable().optional(),
    requested_by: z.string().uuid().nullable().optional(),
    approved_by: z.string().uuid().nullable().optional(),
    requested_at: z.string(),
    processed_at: z.string().nullable().optional(),
  })
  .strict();
export type RefundDto = z.infer<typeof RefundDtoSchema>;

export const RequestRefundInputSchema = z
  .object({
    amount: z.number().positive(),
    reason: z.string().min(1),
  })
  .strict();
export type RequestRefundInput = z.infer<typeof RequestRefundInputSchema>;

export const ApproveRefundInputSchema = z
  .object({
    approved_by: z.string().uuid().optional(),
  })
  .strict();
export type ApproveRefundInput = z.infer<typeof ApproveRefundInputSchema>;

export const RejectRefundInputSchema = z
  .object({
    reason: z.string().optional(),
  })
  .strict();
export type RejectRefundInput = z.infer<typeof RejectRefundInputSchema>;
