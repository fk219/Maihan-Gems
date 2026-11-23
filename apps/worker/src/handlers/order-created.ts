/**
 * apps/worker/src/handlers/order-created.ts
 *
 * `OrderCreated` → queue an order-confirmation email.
 *
 * The event payload carries an order id and nothing else. The recipient, the
 * name and the line items are resolved HERE from the order aggregate, so the
 * outbox row and the broker never hold PII (technical_design/26 §4, §10).
 *
 * The enqueue is keyed `email.order_confirmation:{orderId}`. A redelivered
 * event therefore produces one email, not two — the second enqueue returns the
 * original job with `inserted: false`.
 */
import {
  NotificationRequestSchema,
  ORDER_CREATED,
  OrderCreatedEventPayloadSchema,
} from '@maihan/contracts';

import { PermanentDispatchError } from '../dispatch/errors.js';
import { parseEventPayload } from '../dispatch/parse.js';
import type { EventHandlerRegistration } from '../dispatch/registry.js';
import type { EmailJobEnqueuer } from './email-jobs.js';
import type { OrderNotificationSource } from './sources.js';

export const ORDER_CONFIRMATION_CONSUMER = 'notification.order_confirmation';

export interface OrderCreatedHandlerDeps {
  readonly orders: OrderNotificationSource;
  readonly emailJobs: EmailJobEnqueuer;
  /** Absolute origin for links, e.g. `https://maihangems.com`. */
  readonly appBaseUrl: string;
}

export function createOrderCreatedHandler(
  deps: OrderCreatedHandlerDeps,
): EventHandlerRegistration {
  return {
    consumerName: ORDER_CONFIRMATION_CONSUMER,
    eventTypes: [ORDER_CREATED],
    async handle(event, ctx): Promise<void> {
      const payload = parseEventPayload(
        OrderCreatedEventPayloadSchema,
        event.payload,
        ORDER_CREATED,
      );

      const order = await deps.orders.loadOrder(payload.order_id);
      if (order === null) {
        throw new PermanentDispatchError(`${ORDER_CREATED}: order ${payload.order_id} not found`);
      }

      const request = parseEventPayload(
        NotificationRequestSchema,
        {
          kind: 'order_confirmation',
          recipient: { email: order.email },
          data: {
            orderNumber: order.orderNumber,
            displayName: order.displayName,
            placedAt: order.placedAt,
            currency: order.currency,
            grandTotal: order.grandTotal,
            items: order.items,
            orderUrl: `${deps.appBaseUrl}/account`,
          },
        },
        'order_confirmation notification',
      );

      const result = await deps.emailJobs.enqueueEmail(
        `email.order_confirmation:${payload.order_id}`,
        request,
      );

      ctx.logger.info('notification.enqueued', 'Order confirmation queued', {
        kind: request.kind,
        order_id: payload.order_id,
        duplicate: !result.inserted,
      });
    },
  };
}
