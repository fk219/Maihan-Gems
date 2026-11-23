/**
 * packages/contracts/src/events/notifications.ts
 *
 * The domain-event payloads the worker's notification handlers consume.
 *
 * `[INFERRED]` These shapes are proposals. `OrderCreated` and `OrderFulfilled`
 * are named in technical_design/26 §3; the vendor events follow ADR-026's
 * lifecycle and are not yet in that catalogue. Neither producer exists today:
 * apps/web writes `InventoryReleased` and nothing else. The schemas are strict
 * so the day a producer appears, a malformed payload dead-letters instead of
 * sending an email with a blank line.
 *
 * NO PII AND NO SECRETS. An event payload carries identifiers and shipment
 * facts only. The recipient address and the customer's name are resolved at
 * handle time from the aggregate, and live only in the delivery job payload
 * (technical_design/26 §4, §10).
 */
import { z } from 'zod';

import { HttpUrlSchema } from '../dto/notifications/index.js';

export const ORDER_CREATED = 'OrderCreated' as const;
export const ORDER_FULFILLED = 'OrderFulfilled' as const;
export const VENDOR_APPROVED = 'VendorApproved' as const;
export const VENDOR_SUSPENDED = 'VendorSuspended' as const;

export const OrderCreatedEventPayloadSchema = z
  .object({
    order_id: z.string().uuid(),
  })
  .strict();
export type OrderCreatedEventPayload = z.infer<typeof OrderCreatedEventPayloadSchema>;

export const OrderFulfilledEventPayloadSchema = z
  .object({
    order_id: z.string().uuid(),
    carrier: z.string().trim().min(1).max(80),
    tracking_number: z.string().trim().min(1).max(120),
    /** Null when the carrier gives a number but no public tracking page. */
    tracking_url: HttpUrlSchema.nullable(),
  })
  .strict();
export type OrderFulfilledEventPayload = z.infer<typeof OrderFulfilledEventPayloadSchema>;

export const VendorApprovedEventPayloadSchema = z
  .object({
    vendor_id: z.string().uuid(),
  })
  .strict();
export type VendorApprovedEventPayload = z.infer<typeof VendorApprovedEventPayloadSchema>;

export const VendorSuspendedEventPayloadSchema = z
  .object({
    vendor_id: z.string().uuid(),
    reason: z.string().trim().max(500).nullable(),
  })
  .strict();
export type VendorSuspendedEventPayload = z.infer<typeof VendorSuspendedEventPayloadSchema>;
