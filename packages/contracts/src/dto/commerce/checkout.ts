/**
 * packages/contracts/src/dto/commerce/checkout.ts
 *
 * Phase 6 Tasks 2-4 — Checkout session and checkpoints contracts.
 */
import { z } from 'zod';
import { PricingSnapshotDtoSchema } from './cart.js';

export const CheckoutStepSchema = z.enum([
  'CART',
  'SHIPPING',
  'PAYMENT',
  'CONFIRM',
  'COMPLETED',
]);
export type CheckoutStep = z.infer<typeof CheckoutStepSchema>;

export const ShippingAddressDtoSchema = z
  .object({
    full_name: z.string().min(1),
    recipient: z.string().nullable().optional(),
    line1: z.string().min(1),
    line2: z.string().nullable().optional(),
    line3: z.string().nullable().optional(),
    city: z.string().min(1),
    region: z.string().nullable().optional(),
    postal_code: z.string().min(1),
    country_code: z.string().length(2).default('US'),
    phone: z.string().nullable().optional(),
  })
  .strict();
export type ShippingAddressDto = z.infer<typeof ShippingAddressDtoSchema>;

export const ShippingMethodDtoSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    amount: z.string().regex(/^\d+\.\d{2}$/).default('0.00'),
    estimated_days: z.number().int().optional(),
  })
  .strict();
export type ShippingMethodDto = z.infer<typeof ShippingMethodDtoSchema>;

export const CheckoutSessionDtoSchema = z
  .object({
    id: z.string().min(1),
    cart_token: z.string().min(1),
    customer_id: z.string().uuid().nullable().optional(),
    email: z.string().nullable().optional(),
    current_step: CheckoutStepSchema,
    pricing_snapshot: PricingSnapshotDtoSchema,
    shipping_address: ShippingAddressDtoSchema.nullable().optional(),
    shipping_method: ShippingMethodDtoSchema.nullable().optional(),
    payment_intent_id: z.string().nullable().optional(),
    reservation_expires_at: z.string(),
    created_at: z.string(),
    completed_order_id: z.string().uuid().nullable().optional(),
  })
  .strict();
export type CheckoutSessionDto = z.infer<typeof CheckoutSessionDtoSchema>;

export const CreateCheckoutSessionInputSchema = z
  .object({
    cart_token: z.string().min(1),
    expected_total: z.string().optional(),
    email: z.string().email().optional(),
    customer_id: z.string().uuid().optional(),
  })
  .strict();
export type CreateCheckoutSessionInput = z.input<typeof CreateCheckoutSessionInputSchema>;

export const ShippingCheckpointInputSchema = z
  .object({
    shipping_address: ShippingAddressDtoSchema,
    shipping_method: ShippingMethodDtoSchema.optional(),
  })
  .strict();
export type ShippingCheckpointInput = z.input<typeof ShippingCheckpointInputSchema>;

export const PaymentCheckpointInputSchema = z
  .object({
    method_type: z.enum(['CARD', 'FINANCING', 'WALLET', 'TEST']).default('TEST'),
  })
  .strict();
export type PaymentCheckpointInput = z.input<typeof PaymentCheckpointInputSchema>;

export const ConfirmCheckpointInputSchema = z
  .object({
    idempotency_key: z.string().min(1),
    customer_note: z.string().optional(),
  })
  .strict();
export type ConfirmCheckpointInput = z.input<typeof ConfirmCheckpointInputSchema>;

export const CheckoutSessionEnvelopeSchema = z
  .object({
    data: CheckoutSessionDtoSchema,
  })
  .strict();
export type CheckoutSessionEnvelope = z.infer<typeof CheckoutSessionEnvelopeSchema>;
