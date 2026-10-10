/**
 * packages/contracts/src/dto/commerce/discount.ts
 *
 * Phase 6 Task 10 — Discount validation & redemption contracts.
 * Authority: technical_design/13 COMMERCE ARCHITECTURE §Discounts.
 */
import { z } from 'zod';

export const DiscountTypeSchema = z.enum([
  'PERCENTAGE',
  'FIXED_AMOUNT',
  'FREE_SHIPPING',
  'FINANCING',
  'PROTECTION_PLAN',
]);
export type DiscountType = z.infer<typeof DiscountTypeSchema>;

export const DiscountScopeSchema = z
  .object({
    varieties: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    products: z.array(z.string().uuid()).optional(),
  })
  .strict();
export type DiscountScope = z.infer<typeof DiscountScopeSchema>;

export const DiscountDtoSchema = z
  .object({
    id: z.string().uuid(),
    code: z.string().nullable(),
    name: z.string(),
    type: DiscountTypeSchema,
    value: z.string().nullable(),
    currency: z.string().length(3).nullable(),
    scope: DiscountScopeSchema,
    min_subtotal: z.string().nullable(),
    max_redemptions: z.number().int().nullable(),
    redemption_count: z.number().int(),
    per_customer_limit: z.number().int().nullable(),
    valid_from: z.string(),
    valid_to: z.string().nullable(),
    state: z.string(),
    created_at: z.string(),
  })
  .strict();
export type DiscountDto = z.infer<typeof DiscountDtoSchema>;

export const ValidateDiscountInputSchema = z
  .object({
    code: z.string().min(1),
    subtotal: z.number().nonnegative(),
    customer_id: z.string().uuid().optional(),
    shipping_total: z.number().nonnegative().optional(),
    items: z
      .array(
        z.object({
          product_id: z.string().uuid().optional(),
          variety: z.string().optional(),
          line_total: z.number().nonnegative().optional(),
        }),
      )
      .optional(),
  })
  .strict();
export type ValidateDiscountInput = z.infer<typeof ValidateDiscountInputSchema>;

export const ValidateDiscountResultDtoSchema = z
  .object({
    valid: z.boolean(),
    discount: DiscountDtoSchema,
    discount_amount: z.string().regex(/^\d+\.\d{2}$/),
    final_subtotal: z.string().regex(/^\d+\.\d{2}$/),
  })
  .strict();
export type ValidateDiscountResultDto = z.infer<typeof ValidateDiscountResultDtoSchema>;

export const CreateDiscountInputSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    type: DiscountTypeSchema,
    value: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    scope: DiscountScopeSchema.optional(),
    min_subtotal: z.number().positive().optional(),
    max_redemptions: z.number().int().positive().optional(),
    per_customer_limit: z.number().int().positive().optional(),
    valid_from: z.string().datetime().optional(),
    valid_to: z.string().datetime().optional(),
  })
  .strict();
export type CreateDiscountInput = z.infer<typeof CreateDiscountInputSchema>;
