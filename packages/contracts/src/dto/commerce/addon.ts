/**
 * packages/contracts/src/dto/commerce/addon.ts
 *
 * Phase 6 Task 9 — Financing & Protection Plan product add-on contracts.
 * Authority: technical_design/13 COMMERCE ARCHITECTURE §Add-ons, FR-COM-04.
 */
import { z } from 'zod';
import { OrderDtoSchema } from './order.js';

export const AddonTypeSchema = z.enum([
  'FINANCING',
  'PROTECTION_PLAN',
  'PERCENTAGE',
  'FIXED_AMOUNT',
  'FREE_SHIPPING',
]);
export type AddonType = z.infer<typeof AddonTypeSchema>;

export const ProductAddonDtoSchema = z
  .object({
    id: z.string().uuid(),
    product_id: z.string().uuid().nullable().optional(),
    addon_type: AddonTypeSchema,
    code: z.string(),
    name: z.string(),
    price: z.string().regex(/^\d+\.\d{2}$/),
    currency: z.string().length(3).default('USD'),
    state: z.string().default('ACTIVE'),
    created_at: z.string(),
  })
  .strict();
export type ProductAddonDto = z.infer<typeof ProductAddonDtoSchema>;

export const AttachAddonInputSchema = z
  .object({
    addon_id: z.string().uuid(),
    target_product_id: z.string().uuid().optional(),
  })
  .strict();
export type AttachAddonInput = z.infer<typeof AttachAddonInputSchema>;

export const CreateProductAddonInputSchema = z
  .object({
    product_id: z.string().uuid().optional(),
    addon_type: z.enum(['FINANCING', 'PROTECTION_PLAN']),
    code: z.string().min(1),
    name: z.string().min(1),
    price: z.number().positive(),
    currency: z.string().length(3).optional().default('USD'),
  })
  .strict();
export type CreateProductAddonInput = z.input<typeof CreateProductAddonInputSchema>;

export const AttachAddonResultDtoSchema = z
  .object({
    order: OrderDtoSchema,
    addon_item_id: z.string().uuid(),
  })
  .strict();
export type AttachAddonResultDto = z.infer<typeof AttachAddonResultDtoSchema>;
