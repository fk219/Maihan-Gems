/**
 * apps/worker/src/handlers/vendor-approved.ts
 *
 * `VendorApproved` → queue the vendor's approval email.
 *
 * `[INFERRED]` The event is not in technical_design/26's catalogue; it follows
 * ADR-026's vendor lifecycle. No producer exists yet (apps/web has no vendor
 * approval event), so this handler is wired and tested but not exercised in
 * production until that producer lands.
 *
 * The job key is the vendor id: an approval is a one-time transition, so a
 * replay must not send a second welcome.
 */
import {
  NotificationRequestSchema,
  VENDOR_APPROVED,
  VendorApprovedEventPayloadSchema,
} from '@maihan/contracts';

import { PermanentDispatchError } from '../dispatch/errors.js';
import { parseEventPayload } from '../dispatch/parse.js';
import type { EventHandlerRegistration } from '../dispatch/registry.js';
import type { EmailJobEnqueuer } from './email-jobs.js';
import type { VendorNotificationSource } from './sources.js';

export const VENDOR_APPROVED_CONSUMER = 'notification.vendor_approved';

export interface VendorApprovedHandlerDeps {
  readonly vendors: VendorNotificationSource;
  readonly emailJobs: EmailJobEnqueuer;
  readonly appBaseUrl: string;
}

export function createVendorApprovedHandler(
  deps: VendorApprovedHandlerDeps,
): EventHandlerRegistration {
  return {
    consumerName: VENDOR_APPROVED_CONSUMER,
    eventTypes: [VENDOR_APPROVED],
    async handle(event, ctx): Promise<void> {
      const payload = parseEventPayload(
        VendorApprovedEventPayloadSchema,
        event.payload,
        VENDOR_APPROVED,
      );

      const vendor = await deps.vendors.loadVendor(payload.vendor_id);
      if (vendor === null) {
        throw new PermanentDispatchError(
          `${VENDOR_APPROVED}: vendor ${payload.vendor_id} not found`,
        );
      }

      const request = parseEventPayload(
        NotificationRequestSchema,
        {
          kind: 'vendor_approved',
          recipient: { email: vendor.email },
          data: {
            vendorName: vendor.displayName,
            portalUrl: `${deps.appBaseUrl}/vendor`,
          },
        },
        'vendor_approved notification',
      );

      const result = await deps.emailJobs.enqueueEmail(
        `email.vendor_approved:${payload.vendor_id}`,
        request,
      );

      ctx.logger.info('notification.enqueued', 'Vendor approval queued', {
        kind: request.kind,
        vendor_id: payload.vendor_id,
        duplicate: !result.inserted,
      });
    },
  };
}
