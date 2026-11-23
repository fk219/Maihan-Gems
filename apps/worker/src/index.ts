/**
 * apps/worker — background job runner, event dispatcher, scheduled sweeps.
 *
 * Owns state: none. It executes jobs; it does not own business state.
 * Must never contain: business logic outside handlers.
 *
 * Event flow (technical_design/01): a command commits a `domain_events` row in
 * the same transaction (ADR-020, transactional outbox). The dispatcher claims
 * PENDING rows, runs every registered consumer, records each in
 * `event_consumers` for idempotency, and marks the event PUBLISHED. Consumers
 * queue jobs; one job handler renders and sends email through the EmailPort.
 *
 * This package DISPATCHES; it does not emit business events. apps/web writes
 * `domain_events` in-transaction. This is the web/worker boundary.
 *
 * Neither apps/web nor apps/worker imports the other. Both import the same
 * packages/domain and packages/db.
 *
 * Layout per technical_design/03:
 *   src/dispatch/    outbox dispatcher + job runner (technical_design/26, 27)
 *   src/handlers/    one module per consumed event type, plus the single
 *                    email-sending job handler
 *   src/email/       the EmailPort and its transports
 *   src/schedules/   cron-equivalent sweeps
 *   src/main.ts      process entry and graceful shutdown
 *
 * Known gaps, stated rather than hidden: no email PROVIDER adapter (the
 * transactional-email provider is a deferred client decision); no payment
 * handling (no PSP decision); `OrderCreated`, `OrderFulfilled`,
 * `VendorApproved` and `VendorSuspended` have no producer yet, so the
 * notification pipeline is wired and tested but not exercised by apps/web.
 */
export * from './dispatch/index.js';
export * from './email/index.js';
export * from './handlers/index.js';
export * from './schedules/index.js';
export { createWorker, main, type WorkerOptions, type WorkerRuntime } from './main.js';
