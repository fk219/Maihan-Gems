/**
 * packages/contracts/src/dto/commerce/order.ts
 *
 * Phase 6 Task 4 — Order DTOs, order items, and immutable snapshots.
 */
import { z } from 'zod';
import { PricingSnapshotDtoSchema } from './cart.js';
import { ShippingAddressDtoSchema } from './checkout.js';

export const OrderStateSchema = z.enum([
  'PENDING_PAYMENT',
  'PAID',
  'IN_FULFILLMENT',
  'FULFILLED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
]);
export type OrderState = z.infer<typeof OrderStateSchema>;

export const OrderItemDtoSchema = z
  .object({
    id: z.string().uuid(),
    order_id: z.string().uuid(),
    product_id: z.string().uuid().nullable().optional(),
    configuration_id: z.string().uuid().nullable().optional(),
    sku_snapshot: z.string(),
    title_snapshot: z.string(),
    configuration_snapshot: z.record(z.unknown()).nullable().optional(),
    gem_snapshot: z.record(z.unknown()),
    document_snapshot: z.record(z.unknown()).nullable().optional(),
    quantity: z.number().int().min(1),
    unit_price: z.string().regex(/^\d+\.\d{2}$/),
    line_total: z.string().regex(/^\d+\.\d{2}$/),
    production_days: z.number().int().nullable().optional(),
    state: z.string(),
  })
  .strict();
export type OrderItemDto = z.infer<typeof OrderItemDtoSchema>;

export const OrderDtoSchema = z
  .object({
    id: z.string().uuid(),
    order_number: z.string(),
    customer_id: z.string().uuid().nullable().optional(),
    email: z.string().email(),
    state: OrderStateSchema,
    currency: z.string().length(3).default('USD'),
    subtotal: z.string().regex(/^\d+\.\d{2}$/),
    discount_total: z.string().regex(/^\d+\.\d{2}$/),
    shipping_total: z.string().regex(/^\d+\.\d{2}$/),
    tax_total: z.string().regex(/^\d+\.\d{2}$/),
    grand_total: z.string().regex(/^\d+\.\d{2}$/),
    pricing_snapshot: PricingSnapshotDtoSchema,
    shipping_address: ShippingAddressDtoSchema,
    billing_address: ShippingAddressDtoSchema.nullable().optional(),
    customer_note: z.string().nullable().optional(),
    placed_at: z.string().nullable().optional(),
    idempotency_key: z.string().nullable().optional(),
    version: z.number().int().default(1),
    created_at: z.string(),
    items: z.array(OrderItemDtoSchema).default([]),
  })
  .strict();
export type OrderDto = z.infer<typeof OrderDtoSchema>;

export const PlaceOrderInputSchema = z
  .object({
    checkout_session_id: z.string().min(1),
    idempotency_key: z.string().min(1),
    customer_note: z.string().optional(),
    billing_address: ShippingAddressDtoSchema.optional(),
  })
  .strict();
export type PlaceOrderInput = z.input<typeof PlaceOrderInputSchema>;

export const OrderEnvelopeSchema = z
  .object({
    data: OrderDtoSchema,
  })
  .strict();
export type OrderEnvelope = z.infer<typeof OrderEnvelopeSchema>;
