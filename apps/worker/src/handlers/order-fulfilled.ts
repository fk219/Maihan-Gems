/**
 * apps/worker/src/handlers/order-fulfilled.ts
 *
 * `OrderFulfilled` → queue a shipping-update email.
 *
 * Carrier and tracking facts come from the event because they are shipment
 * facts, not PII. The recipient and the order number are resolved from the
 * aggregate.
 *
 * The job key includes the tracking number: a second, legitimately different
 * shipment on the same order deserves its own email, while a redelivery of the
 * same fulfilment does not.
 */
import {
  NotificationRequestSchema,
  ORDER_FULFILLED,
  OrderFulfilledEventPayloadSchema,
} from '@maihan/contracts';

import { PermanentDispatchError } from '../dispatch/errors.js';
import { parseEventPayload } from '../dispatch/parse.js';
import type { EventHandlerRegistration } from '../dispatch/registry.js';
import type { EmailJobEnqueuer } from './email-jobs.js';
import type { OrderNotificationSource } from './sources.js';

export const SHIPPING_UPDATE_CONSUMER = 'notification.shipping_update';

export interface OrderFulfilledHandlerDeps {
  readonly orders: OrderNotificationSource;
  readonly emailJobs: EmailJobEnqueuer;
  readonly appBaseUrl: string;
}

export function createOrderFulfilledHandler(
  deps: OrderFulfilledHandlerDeps,
): EventHandlerRegistration {
  return {
    consumerName: SHIPPING_UPDATE_CONSUMER,
    eventTypes: [ORDER_FULFILLED],
    async handle(event, ctx): Promise<void> {
      const payload = parseEventPayload(
        OrderFulfilledEventPayloadSchema,
        event.payload,
        ORDER_FULFILLED,
      );

      const order = await deps.orders.loadOrder(payload.order_id);
      if (order === null) {
        throw new PermanentDispatchError(`${ORDER_FULFILLED}: order ${payload.order_id} not found`);
      }

      const request = parseEventPayload(
        NotificationRequestSchema,
        {
          kind: 'shipping_update',
          recipient: { email: order.email },
          data: {
            orderNumber: order.orderNumber,
            displayName: order.displayName,
            carrier: payload.carrier,
            trackingNumber: payload.tracking_number,
            trackingUrl: payload.tracking_url,
            shippedAt: event.occurredAt.toISOString(),
            orderUrl: `${deps.appBaseUrl}/account`,
          },
        },
        'shipping_update notification',
      );

      const result = await deps.emailJobs.enqueueEmail(
        `email.shipping_update:${payload.order_id}:${payload.tracking_number}`,
        request,
      );

      ctx.logger.info('notification.enqueued', 'Shipping update queued', {
        kind: request.kind,
        order_id: payload.order_id,
        duplicate: !result.inserted,
      });
    },
  };
}
