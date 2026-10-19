/**
 * packages/contracts/src/dto/commerce/cart.ts
 *
 * Phase 6 Task 1 — Cart DTOs and request/response contracts.
 */
import { z } from 'zod';

export const PricingSnapshotDtoSchema = z
  .object({
    currency: z.literal('USD'),
    subtotal: z.string().regex(/^\d+\.\d{2}$/),
    discount_total: z.string().regex(/^\d+\.\d{2}$/),
    shipping_total: z.string().regex(/^\d+\.\d{2}$/),
    tax_total: z.string().regex(/^\d+\.\d{2}$/),
    grand_total: z.string().regex(/^\d+\.\d{2}$/),
    item_count: z.number().int().nonnegative(),
    computed_at: z.string(),
  })
  .strict();
export type PricingSnapshotDto = z.infer<typeof PricingSnapshotDtoSchema>;

export const CartItemDtoSchema = z
  .object({
    id: z.string().uuid(),
    product_id: z.string().uuid(),
    product_slug: z.string().min(1),
    title: z.string().min(1),
    configuration_id: z.string().uuid().nullable().optional(),
    quantity: z.number().int().positive(),
    unit_price: z.string().regex(/^\d+\.\d{2}$/),
    line_total: z.string().regex(/^\d+\.\d{2}$/),
    engraving_text: z.string().nullable().optional(),
    options: z.record(z.string(), z.unknown()).default({}),
    added_at: z.string(),
  })
  .strict();
export type CartItemDto = z.infer<typeof CartItemDtoSchema>;

export const CartDtoSchema = z
  .object({
    id: z.string().uuid(),
    cart_token: z.string().min(1),
    customer_id: z.string().uuid().nullable(),
    anonymous_session_id: z.string().nullable(),
    currency: z.literal('USD'),
    state: z.enum(['ACTIVE', 'CONVERTED', 'ABANDONED', 'EXPIRED']),
    pricing_snapshot: PricingSnapshotDtoSchema,
    items: z.array(CartItemDtoSchema),
    expires_at: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict();
export type CartDto = z.infer<typeof CartDtoSchema>;

export const CreateCartInputSchema = z
  .object({
    customer_id: z.string().uuid().optional(),
    anonymous_session_id: z.string().optional(),
    currency: z.literal('USD').default('USD'),
  })
  .strict();
export type CreateCartInput = z.input<typeof CreateCartInputSchema>;

export const AddToCartInputSchema = z
  .object({
    product_id: z.string().uuid().optional(),
    /** Resolve by public slug instead of UUID (slug is the catalogue's public identity). Exactly one of product_id / product_slug is required. */
    product_slug: z.string().min(1).optional(),
    configuration_id: z.string().uuid().optional(),
    quantity: z.number().int().positive().max(99).default(1),
    engraving_text: z.string().max(50).optional(),
    options: z.record(z.string(), z.unknown()).optional(),
    expected_unit_price: z.string().optional(),
  })
  .strict()
  .refine((v) => v.product_id !== undefined || v.product_slug !== undefined, {
    message: 'product_id or product_slug is required',
  });
export type AddToCartInput = z.input<typeof AddToCartInputSchema>;

export const UpdateCartItemInputSchema = z
  .object({
    quantity: z.number().int().positive().max(99),
    expected_unit_price: z.string().optional(),
  })
  .strict();
export type UpdateCartItemInput = z.input<typeof UpdateCartItemInputSchema>;

export const MergeCartInputSchema = z
  .object({
    guest_cart_token: z.string().min(1),
  })
  .strict();
export type MergeCartInput = z.input<typeof MergeCartInputSchema>;

export const CartEnvelopeSchema = z
  .object({
    data: CartDtoSchema,
  })
  .strict();
export type CartEnvelope = z.infer<typeof CartEnvelopeSchema>;
