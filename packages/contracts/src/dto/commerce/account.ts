/**
 * packages/contracts/src/dto/commerce/account.ts
 *
 * Phase 6 Task 7 — Customer accounts, profiles, addresses, and order history contracts.
 */
import { z } from 'zod';
import { OrderDtoSchema } from './order.js';

export const CustomerProfileDtoSchema = z
  .object({
    customer_id: z.string().uuid(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    email: z.string().email(),
    phone: z.string().nullable().optional(),
    preferred_currency: z.string().length(3).default('USD'),
    birth_date: z.string().nullable().optional(),
    birth_place: z.string().nullable().optional(),
    zodiac_sign: z.string().nullable().optional(),
    ring_size: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .strict();
export type CustomerProfileDto = z.infer<typeof CustomerProfileDtoSchema>;

export const UpdateCustomerProfileInputSchema = z
  .object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone: z.string().optional(),
    preferred_currency: z.string().length(3).optional(),
    birth_date: z.string().optional(),
    birth_place: z.string().optional(),
    zodiac_sign: z.string().optional(),
    ring_size: z.string().optional(),
  })
  .strict();
export type UpdateCustomerProfileInput = z.infer<typeof UpdateCustomerProfileInputSchema>;

export const CustomerAddressDtoSchema = z
  .object({
    id: z.string().uuid(),
    customer_id: z.string().uuid(),
    kind: z.enum(['SHIPPING', 'BILLING', 'SHOWROOM', 'PICKUP']),
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
    is_default: z.boolean().default(false),
  })
  .strict();
export type CustomerAddressDto = z.infer<typeof CustomerAddressDtoSchema>;

export const CreateCustomerAddressInputSchema = z
  .object({
    kind: z.enum(['SHIPPING', 'BILLING', 'SHOWROOM', 'PICKUP']).default('SHIPPING'),
    full_name: z.string().min(1),
    recipient: z.string().optional(),
    line1: z.string().min(1),
    line2: z.string().optional(),
    line3: z.string().optional(),
    city: z.string().min(1),
    region: z.string().optional(),
    postal_code: z.string().min(1),
    country_code: z.string().length(2).default('US'),
    phone: z.string().optional(),
    is_default: z.boolean().default(false),
  })
  .strict();
export type CreateCustomerAddressInput = z.infer<typeof CreateCustomerAddressInputSchema>;

export const UpdateCustomerAddressInputSchema = CreateCustomerAddressInputSchema.partial();
export type UpdateCustomerAddressInput = z.infer<typeof UpdateCustomerAddressInputSchema>;

export const CustomerOrderListDtoSchema = z
  .object({
    orders: z.array(OrderDtoSchema),
    total_count: z.number().int(),
  })
  .strict();
export type CustomerOrderListDto = z.infer<typeof CustomerOrderListDtoSchema>;
