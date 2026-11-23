/**
 * packages/contracts/src/dto/notifications/index.ts
 *
 * BUILD_BACKLOG Track B4 — the notification wire contract.
 *
 * One schema per notification kind, plus the discriminated request that a
 * delivery job carries. `.strict()` everywhere: an unknown field is a 400, not
 * a silently discarded input, so a producer cannot smuggle a field the
 * renderer never sees.
 *
 * PII is deliberately narrow:
 *   - `recipient.email` is the delivery address and nothing else;
 *   - `data` contains only values the template prints.
 * There is no customer id, no phone number, no address block, no order history.
 *
 * The shapes mirror `@maihan/domain`'s render inputs exactly. The contract
 * spec asserts the assignability, so a field renamed in one place fails the
 * build rather than producing an email with a blank line.
 */
import { z } from 'zod';

/**
 * An absolute http(s) URL. Zod's `.url()` alone accepts `javascript:`; an
 * email is a place where that difference matters, so the scheme is pinned
 * here as well as in the renderer.
 */
export const HttpUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => /^https?:\/\//i.test(value), {
    message: 'must be an absolute http(s) URL',
  });

/** Money is a decimal string, never a number (technical_design/26 §4). */
export const MoneyStringSchema = z.string().regex(/^\d{1,13}\.\d{2}$/, {
  message: 'must be a decimal money string with two fraction digits',
});

export const NotificationRecipientSchema = z
  .object({
    /** The only PII a delivery job carries: where the message goes. */
    email: z.string().trim().email().max(320),
  })
  .strict();
export type NotificationRecipient = z.infer<typeof NotificationRecipientSchema>;

const DisplayNameSchema = z.string().trim().min(1).max(120).nullable();

export const NotificationOrderLineSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    quantity: z.number().int().min(1).max(999),
    lineTotal: MoneyStringSchema,
  })
  .strict();
export type NotificationOrderLine = z.infer<typeof NotificationOrderLineSchema>;

export const OrderConfirmationDataSchema = z
  .object({
    orderNumber: z.string().trim().min(1).max(64),
    displayName: DisplayNameSchema,
    placedAt: z.string().datetime(),
    currency: z.string().length(3).regex(/^[A-Z]{3}$/),
    grandTotal: MoneyStringSchema,
    items: z.array(NotificationOrderLineSchema).max(200),
    orderUrl: HttpUrlSchema,
  })
  .strict();
export type OrderConfirmationData = z.infer<typeof OrderConfirmationDataSchema>;

export const ShippingUpdateDataSchema = z
  .object({
    orderNumber: z.string().trim().min(1).max(64),
    displayName: DisplayNameSchema,
    carrier: z.string().trim().min(1).max(80),
    trackingNumber: z.string().trim().min(1).max(120),
    trackingUrl: HttpUrlSchema.nullable(),
    shippedAt: z.string().datetime(),
    orderUrl: HttpUrlSchema,
  })
  .strict();
export type ShippingUpdateData = z.infer<typeof ShippingUpdateDataSchema>;

export const PasswordResetDataSchema = z
  .object({
    displayName: DisplayNameSchema,
    resetUrl: HttpUrlSchema,
    expiresAt: z.string().datetime(),
  })
  .strict();
export type PasswordResetData = z.infer<typeof PasswordResetDataSchema>;

export const EmailVerificationDataSchema = z
  .object({
    displayName: DisplayNameSchema,
    verifyUrl: HttpUrlSchema,
    expiresAt: z.string().datetime(),
  })
  .strict();
export type EmailVerificationData = z.infer<typeof EmailVerificationDataSchema>;

export const VendorApprovedDataSchema = z
  .object({
    vendorName: z.string().trim().min(1).max(120),
    portalUrl: HttpUrlSchema,
  })
  .strict();
export type VendorApprovedData = z.infer<typeof VendorApprovedDataSchema>;

export const VendorSuspendedDataSchema = z
  .object({
    vendorName: z.string().trim().min(1).max(120),
    reason: z.string().trim().max(500).nullable(),
    supportUrl: HttpUrlSchema,
  })
  .strict();
export type VendorSuspendedData = z.infer<typeof VendorSuspendedDataSchema>;

/**
 * The delivery request. `kind` selects the template; `recipient` is the
 * address; `data` is the template input. A mismatch between kind and data is a
 * parse failure, not a best-effort guess.
 */
export const NotificationRequestSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('order_confirmation'),
      recipient: NotificationRecipientSchema,
      data: OrderConfirmationDataSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('shipping_update'),
      recipient: NotificationRecipientSchema,
      data: ShippingUpdateDataSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('password_reset'),
      recipient: NotificationRecipientSchema,
      data: PasswordResetDataSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('email_verification'),
      recipient: NotificationRecipientSchema,
      data: EmailVerificationDataSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('vendor_approved'),
      recipient: NotificationRecipientSchema,
      data: VendorApprovedDataSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('vendor_suspended'),
      recipient: NotificationRecipientSchema,
      data: VendorSuspendedDataSchema,
    })
    .strict(),
]);
export type NotificationRequest = z.infer<typeof NotificationRequestSchema>;
export type NotificationRequestKind = NotificationRequest['kind'];

/** Job type + queue for the one handler permitted to touch the EmailPort. */
export const EMAIL_SEND_JOB_TYPE = 'EMAIL_SEND' as const;
export const EMAIL_QUEUE = 'default' as const;
