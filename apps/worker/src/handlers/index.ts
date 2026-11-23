/**
 * apps/worker/src/handlers/index.ts
 *
 * Wiring for the handler registries. One place lists every consumer this
 * worker owns, so "what does the worker actually do?" has a single answer.
 *
 * To add a consumer: write its module, register it here, add a test. Nothing
 * else changes.
 */
import {
  EMAIL_SEND_JOB_TYPE,
} from '@maihan/contracts';
import type { CatalogDatabase } from '@maihan/db';

import type { EmailPort } from '../email/port.js';
import { HandlerRegistry, JobHandlerRegistry } from '../dispatch/registry.js';
import { createEmailJobEnqueuer, type EmailJobEnqueuer } from './email-jobs.js';
import { createEmailSendJobHandler } from './email-send.js';
import { createOrderCreatedHandler } from './order-created.js';
import { createOrderFulfilledHandler } from './order-fulfilled.js';
import { createVendorApprovedHandler } from './vendor-approved.js';
import { createVendorSuspendedHandler } from './vendor-suspended.js';
import {
  createOrderNotificationSource,
  createVendorNotificationSource,
  type OrderNotificationSource,
  type VendorNotificationSource,
} from './sources.js';

export * from './sources.js';
export * from './email-jobs.js';
export { createEmailSendJobHandler } from './email-send.js';
export { createOrderCreatedHandler, ORDER_CONFIRMATION_CONSUMER } from './order-created.js';
export { createOrderFulfilledHandler, SHIPPING_UPDATE_CONSUMER } from './order-fulfilled.js';
export { createVendorApprovedHandler, VENDOR_APPROVED_CONSUMER } from './vendor-approved.js';
export { createVendorSuspendedHandler, VENDOR_SUSPENDED_CONSUMER } from './vendor-suspended.js';

export interface HandlerWiringDeps {
  readonly db: CatalogDatabase;
  readonly email: EmailPort;
  readonly appBaseUrl: string;
  /** Injected in tests; production uses the DB-backed sources. */
  readonly orders?: OrderNotificationSource;
  readonly vendors?: VendorNotificationSource;
  readonly emailJobs?: EmailJobEnqueuer;
}

export function createHandlerRegistry(deps: HandlerWiringDeps): HandlerRegistry {
  const orders = deps.orders ?? createOrderNotificationSource(deps.db);
  const vendors = deps.vendors ?? createVendorNotificationSource(deps.db);
  const emailJobs = deps.emailJobs ?? createEmailJobEnqueuer(deps.db);

  return new HandlerRegistry()
    .register(createOrderCreatedHandler({ orders, emailJobs, appBaseUrl: deps.appBaseUrl }))
    .register(createOrderFulfilledHandler({ orders, emailJobs, appBaseUrl: deps.appBaseUrl }))
    .register(createVendorApprovedHandler({ vendors, emailJobs, appBaseUrl: deps.appBaseUrl }))
    .register(createVendorSuspendedHandler({ vendors, emailJobs, appBaseUrl: deps.appBaseUrl }));
}

export function createJobHandlerRegistry(deps: { email: EmailPort }): JobHandlerRegistry {
  return new JobHandlerRegistry().register(
    EMAIL_SEND_JOB_TYPE,
    createEmailSendJobHandler({ email: deps.email }),
  );
}
