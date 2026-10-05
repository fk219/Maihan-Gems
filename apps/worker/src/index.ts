/**
 * apps/worker — background job runner, event dispatcher, scheduled sweeps.
 *
 * Owns state: none. It executes jobs; it does not own business state.
 * Must never contain: business logic outside handlers.
 *
 * Event flow (technical_design/01): a command commits a `domain_events` row in
 * the same transaction (ADR-020, transactional outbox). The dispatcher polls
 * PENDING and marks PUBLISHED. Consumers read, record in `event_consumers` for
 * idempotency, then act. At-least-once delivery; ordering is guaranteed per
 * aggregate, never globally.
 *
 * This package DISPATCHES; it does not emit business events. apps/web writes
 * `domain_events` in-transaction. This is the web/worker boundary.
 *
 * Neither apps/web nor apps/worker imports the other. Both import the same
 * packages/domain and packages/db.
 *
 * Phase 1 Task 1 scope: workspace skeleton only. There are no queues, handlers,
 * dispatchers or schedules yet. Job queues arrive with Phase 1's outbox work;
 * the Redis client (approved, 14.1) arrives when there is a queue to poll.
 *
 * Layout per technical_design/03:
 *   src/queues/      queue definitions (technical_design/27)
 *   src/handlers/    one module per job type
 *   src/dispatch/    outbox dispatcher (technical_design/26)
 *   src/schedules/   cron-equivalent sweeps
 */
export {};
