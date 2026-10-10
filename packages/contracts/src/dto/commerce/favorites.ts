/**
 * packages/contracts/src/dto/commerce/favorites.ts
 *
 * Phase 6 Task 8 — Wishlist (/favorites) and Compare-list (/compare) DTOs.
 * Authority: PROJECT_SOURCE_OF_TRUTH.md §11.5, §24, FR-COM-05.
 */
import { z } from 'zod';

export const AddFavoriteInputSchema = z
  .object({
    product_id: z.string().uuid(),
  })
  .strict();
export type AddFavoriteInput = z.infer<typeof AddFavoriteInputSchema>;

export const FavoriteItemDtoSchema = z
  .object({
    id: z.string().uuid(),
    sku: z.string(),
    title: z.string(),
    price_amount: z.string().nullable(),
    currency: z.string().length(3),
    variety: z.string().nullable(),
    primary_image_url: z.string().nullable(),
    availability: z.boolean(),
    created_at: z.string().datetime(),
  })
  .strict();
export type FavoriteItemDto = z.infer<typeof FavoriteItemDtoSchema>;

export const CompareProductDtoSchema = z
  .object({
    id: z.string().uuid(),
    sku: z.string(),
    title: z.string(),
    price_amount: z.string().nullable(),
    currency: z.string().length(3),
    variety: z.string().nullable(),
    gemstone_species: z.string().nullable(),
    carat_weight: z.number().nullable(),
    dimensions: z.string().nullable(),
    shape: z.string().nullable(),
    color: z.string().nullable(),
    clarity: z.string().nullable(),
    origin: z.string().nullable(),
    treatment: z.string().nullable(),
    certificate: z.string().nullable(),
    primary_image_url: z.string().nullable(),
  })
  .strict();
export type CompareProductDto = z.infer<typeof CompareProductDtoSchema>;

export const CompareAttributeRowSchema = z
  .object({
    key: z.string(),
    label: z.string(),
    values: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
  })
  .strict();
export type CompareAttributeRow = z.infer<typeof CompareAttributeRowSchema>;

export const CompareMatrixDtoSchema = z
  .object({
    products: z.array(CompareProductDtoSchema),
    attributes: z.array(CompareAttributeRowSchema),
  })
  .strict();
export type CompareMatrixDto = z.infer<typeof CompareMatrixDtoSchema>;
