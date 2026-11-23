/**
 * packages/domain/src/notifications/types.ts
 *
 * BUILD_BACKLOG Track B4 — the notification vocabulary, as pure data.
 *
 * These are the RENDER inputs. They deliberately contain no recipient address:
 * where an email goes is a delivery concern, owned by the worker's job payload
 * and its EmailPort. A template sees only what it must print, which is the
 * narrowest PII surface this feature can have.
 *
 * Money is a decimal string, never a number (technical_design/26 §4, §7 rule 6).
 * Dates are ISO-8601 strings: the renderer formats them deterministically and
 * never reads a clock.
 *
 * No imports. packages/domain declares zero runtime dependencies and may not
 * perform I/O (technical_design/02, 03; enforced by eslint.config.mjs and
 * domain-purity.spec.ts).
 */

export const NOTIFICATION_KINDS = Object.freeze([
  'order_confirmation',
  'shipping_update',
  'password_reset',
  'email_verification',
  'vendor_approved',
  'vendor_suspended',
] as const);

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** One line of an order. `lineTotal` is a decimal string in `currency`. */
export interface NotificationOrderLine {
  readonly title: string;
  readonly quantity: number;
  readonly lineTotal: string;
}

/**
 * Order confirmation. `displayName` is the greeting name from the shipping
 * address; it is optional because a guest order may not carry one.
 */
export interface OrderConfirmationData {
  readonly orderNumber: string;
  readonly displayName: string | null;
  readonly placedAt: string;
  readonly currency: string;
  readonly grandTotal: string;
  readonly items: readonly NotificationOrderLine[];
  readonly orderUrl: string;
}

/**
 * Shipping update. `trackingUrl` is nullable: a carrier may hand over a
 * tracking number with no public link, and inventing one would be a lie.
 */
export interface ShippingUpdateData {
  readonly orderNumber: string;
  readonly displayName: string | null;
  readonly carrier: string;
  readonly trackingNumber: string;
  readonly trackingUrl: string | null;
  readonly shippedAt: string;
  readonly orderUrl: string;
}

export interface PasswordResetData {
  readonly displayName: string | null;
  readonly resetUrl: string;
  readonly expiresAt: string;
}

export interface EmailVerificationData {
  readonly displayName: string | null;
  readonly verifyUrl: string;
  readonly expiresAt: string;
}

export interface VendorApprovedData {
  readonly vendorName: string;
  readonly portalUrl: string;
}

export interface VendorSuspendedData {
  readonly vendorName: string;
  readonly reason: string | null;
  readonly supportUrl: string;
}

/** Kind → render input. The map is the single place a new kind is declared. */
export interface NotificationDataMap {
  readonly order_confirmation: OrderConfirmationData;
  readonly shipping_update: ShippingUpdateData;
  readonly password_reset: PasswordResetData;
  readonly email_verification: EmailVerificationData;
  readonly vendor_approved: VendorApprovedData;
  readonly vendor_suspended: VendorSuspendedData;
}

export type NotificationDataFor<K extends NotificationKind> = NotificationDataMap[K];

export type AnyNotificationData = NotificationDataMap[NotificationKind];

/** What a renderer returns. Subject is single-line plain text, never HTML. */
export interface RenderedNotification {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}
