/**
 * apps/worker/src/handlers/vendor-suspended.ts
 *
 * `VendorSuspended` → queue the suspension email.
 *
 * `[INFERRED]` As with approval, the event follows ADR-026's lifecycle and has
 * no producer yet.
 *
 * The job key includes the EVENT id, not just the vendor id: a vendor may be
 * suspended, reinstated and suspended again, and the second suspension is a
 * new fact that deserves its own email. A replay of the same event still
 * collapses to one job.
 */
import {
  NotificationRequestSchema,
  VENDOR_SUSPENDED,
  VendorSuspendedEventPayloadSchema,
} from '@maihan/contracts';

import { PermanentDispatchError } from '../dispatch/errors.js';
import { parseEventPayload } from '../dispatch/parse.js';
import type { EventHandlerRegistration } from '../dispatch/registry.js';
import type { EmailJobEnqueuer } from './email-jobs.js';
import type { VendorNotificationSource } from './sources.js';

export const VENDOR_SUSPENDED_CONSUMER = 'notification.vendor_suspended';

export interface VendorSuspendedHandlerDeps {
  readonly vendors: VendorNotificationSource;
  readonly emailJobs: EmailJobEnqueuer;
  readonly appBaseUrl: string;
}

export function createVendorSuspendedHandler(
  deps: VendorSuspendedHandlerDeps,
): EventHandlerRegistration {
  return {
    consumerName: VENDOR_SUSPENDED_CONSUMER,
    eventTypes: [VENDOR_SUSPENDED],
    async handle(event, ctx): Promise<void> {
      const payload = parseEventPayload(
        VendorSuspendedEventPayloadSchema,
        event.payload,
        VENDOR_SUSPENDED,
      );

      const vendor = await deps.vendors.loadVendor(payload.vendor_id);
      if (vendor === null) {
        throw new PermanentDispatchError(
          `${VENDOR_SUSPENDED}: vendor ${payload.vendor_id} not found`,
        );
      }

      const request = parseEventPayload(
        NotificationRequestSchema,
        {
          kind: 'vendor_suspended',
          recipient: { email: vendor.email },
          data: {
            vendorName: vendor.displayName,
            reason: payload.reason,
            supportUrl: `${deps.appBaseUrl}/contact`,
          },
        },
        'vendor_suspended notification',
      );

      const result = await deps.emailJobs.enqueueEmail(
        `email.vendor_suspended:${payload.vendor_id}:${event.eventId}`,
        request,
      );

      ctx.logger.info('notification.enqueued', 'Vendor suspension queued', {
        kind: request.kind,
        vendor_id: payload.vendor_id,
        duplicate: !result.inserted,
      });
    },
  };
}
