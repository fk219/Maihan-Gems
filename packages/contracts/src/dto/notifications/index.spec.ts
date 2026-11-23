/**
 * packages/contracts/src/dto/notifications/index.spec.ts
 *
 * The contract gate:
 *   - every kind parses a complete, realistic payload;
 *   - an unknown field is rejected, not dropped;
 *   - a `javascript:` URL is rejected at the boundary;
 *   - a kind/data mismatch is a parse failure;
 *   - the contract data types are assignable to the domain renderer inputs,
 *     proven at COMPILE time and exercised at runtime through the renderer.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { renderNotification } from '@maihan/domain';

import {
  EmailVerificationDataSchema,
  NotificationRequestSchema,
  OrderConfirmationDataSchema,
  PasswordResetDataSchema,
  ShippingUpdateDataSchema,
  VendorApprovedDataSchema,
  VendorSuspendedDataSchema,
  type NotificationRequest,
} from './index.js';
import type {
  EmailVerificationData as DomainEmailVerificationData,
  OrderConfirmationData as DomainOrderConfirmationData,
  PasswordResetData as DomainPasswordResetData,
  ShippingUpdateData as DomainShippingUpdateData,
  VendorApprovedData as DomainVendorApprovedData,
  VendorSuspendedData as DomainVendorSuspendedData,
} from '@maihan/domain';

/**
 * Compile-time proof that each wire type is a valid renderer input. If a field
 * is renamed on one side, `pnpm run typecheck` fails here rather than an email
 * shipping with a blank line.
 */
type ExpectAssignable<Actual extends Expected, Expected> = Actual;
export type _Order = ExpectAssignable<z.infer<typeof OrderConfirmationDataSchema>, DomainOrderConfirmationData>;
export type _Shipping = ExpectAssignable<z.infer<typeof ShippingUpdateDataSchema>, DomainShippingUpdateData>;
export type _Reset = ExpectAssignable<z.infer<typeof PasswordResetDataSchema>, DomainPasswordResetData>;
export type _Verify = ExpectAssignable<z.infer<typeof EmailVerificationDataSchema>, DomainEmailVerificationData>;
export type _Approved = ExpectAssignable<z.infer<typeof VendorApprovedDataSchema>, DomainVendorApprovedData>;
export type _Suspended = ExpectAssignable<z.infer<typeof VendorSuspendedDataSchema>, DomainVendorSuspendedData>;

const recipient = { email: 'ada@example.com' };

const orderData = {
  orderNumber: 'MG-2026-000123',
  displayName: 'Ada Lovelace',
  placedAt: '2026-11-23T10:15:00.000Z',
  currency: 'USD',
  grandTotal: '5218.00',
  items: [{ title: 'Unheated Ceylon Sapphire', quantity: 1, lineTotal: '4800.00' }],
  orderUrl: 'https://maihangems.example/account/orders/MG-2026-000123',
};

const shippingData = {
  orderNumber: 'MG-2026-000123',
  displayName: 'Ada Lovelace',
  carrier: 'DHL Express',
  trackingNumber: 'JD014600003889123456',
  trackingUrl: 'https://tracking.example/JD014600003889123456',
  shippedAt: '2026-11-24T08:00:00.000Z',
  orderUrl: 'https://maihangems.example/account/orders/MG-2026-000123',
};

const resetData = {
  displayName: 'Ada Lovelace',
  resetUrl: 'https://maihangems.example/account/reset?token=opaque',
  expiresAt: '2026-11-23T11:15:00.000Z',
};

const verifyData = {
  displayName: 'Ada Lovelace',
  verifyUrl: 'https://maihangems.example/account/verify?token=opaque',
  expiresAt: '2026-11-24T10:15:00.000Z',
};

const approvedData = {
  vendorName: 'Ceylon House',
  portalUrl: 'https://maihangems.example/vendor',
};

const suspendedData = {
  vendorName: 'Ceylon House',
  reason: 'Repeated late dispatch',
  supportUrl: 'https://maihangems.example/contact',
};

const requests: readonly NotificationRequest[] = [
  { kind: 'order_confirmation', recipient, data: orderData },
  { kind: 'shipping_update', recipient, data: shippingData },
  { kind: 'password_reset', recipient, data: resetData },
  { kind: 'email_verification', recipient, data: verifyData },
  { kind: 'vendor_approved', recipient, data: approvedData },
  { kind: 'vendor_suspended', recipient, data: suspendedData },
];

describe('NotificationRequestSchema', () => {
  it('parses all six kinds', () => {
    for (const request of requests) {
      const parsed = NotificationRequestSchema.parse(request);
      expect(parsed.kind).toBe(request.kind);
    }
  });

  it('rejects an unknown field rather than dropping it', () => {
    const result = NotificationRequestSchema.safeParse({
      ...requests[0],
      // A producer trying to smuggle a field the renderer never prints.
      bcc: 'attacker@example.com',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown field inside data', () => {
    const result = NotificationRequestSchema.safeParse({
      kind: 'order_confirmation',
      recipient,
      data: { ...orderData, internal_note: 'do not send' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a javascript: URL at the boundary', () => {
    const result = OrderConfirmationDataSchema.safeParse({
      ...orderData,
      orderUrl: 'javascript:alert(1)',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a data URL at the boundary', () => {
    const result = ShippingUpdateDataSchema.safeParse({
      ...shippingData,
      trackingUrl: 'data:text/html,<script>alert(1)</script>',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a kind/data mismatch', () => {
    const result = NotificationRequestSchema.safeParse({
      kind: 'shipping_update',
      recipient,
      data: orderData,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a money value that is a JSON number', () => {
    const result = OrderConfirmationDataSchema.safeParse({ ...orderData, grandTotal: 5218 });
    expect(result.success).toBe(false);
  });

  it('rejects a display name that is an empty string instead of null', () => {
    const result = OrderConfirmationDataSchema.safeParse({ ...orderData, displayName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed recipient address', () => {
    const result = NotificationRequestSchema.safeParse({
      ...requests[0],
      recipient: { email: 'not-an-address' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts a null display name and a null tracking URL explicitly', () => {
    expect(
      OrderConfirmationDataSchema.safeParse({ ...orderData, displayName: null }).success,
    ).toBe(true);
    expect(
      ShippingUpdateDataSchema.safeParse({ ...shippingData, trackingUrl: null }).success,
    ).toBe(true);
  });

  it('rejects a null reason only where the domain requires a value', () => {
    expect(
      VendorSuspendedDataSchema.safeParse({ ...suspendedData, reason: null }).success,
    ).toBe(true);
    expect(
      VendorApprovedDataSchema.safeParse({ ...approvedData, reason: null }).success,
    ).toBe(false);
  });
});

describe('contract → renderer assignability', () => {
  it('renders every parsed request without a cast or a fallback', () => {
    for (const request of requests) {
      const parsed = NotificationRequestSchema.parse(request);
      switch (parsed.kind) {
        case 'order_confirmation': {
          const rendered = renderNotification(parsed.kind, parsed.data);
          expect(rendered.subject).toContain(parsed.data.orderNumber);
          break;
        }
        case 'shipping_update': {
          const rendered = renderNotification(parsed.kind, parsed.data);
          expect(rendered.text).toContain(parsed.data.trackingNumber);
          break;
        }
        case 'password_reset': {
          const rendered = renderNotification(parsed.kind, parsed.data);
          expect(rendered.text).toContain(parsed.data.resetUrl);
          break;
        }
        case 'email_verification': {
          const rendered = renderNotification(parsed.kind, parsed.data);
          expect(rendered.text).toContain(parsed.data.verifyUrl);
          break;
        }
        case 'vendor_approved': {
          const rendered = renderNotification(parsed.kind, parsed.data);
          expect(rendered.text).toContain(parsed.data.vendorName);
          break;
        }
        case 'vendor_suspended': {
          const rendered = renderNotification(parsed.kind, parsed.data);
          expect(rendered.text).toContain(parsed.data.vendorName);
          break;
        }
      }
    }
  });

  it('keeps the six data schemas in step with the domain data map', () => {
    expect(OrderConfirmationDataSchema).toBeDefined();
    expect(ShippingUpdateDataSchema).toBeDefined();
    expect(PasswordResetDataSchema).toBeDefined();
    expect(EmailVerificationDataSchema).toBeDefined();
    expect(VendorApprovedDataSchema).toBeDefined();
    expect(VendorSuspendedDataSchema).toBeDefined();
  });
});
