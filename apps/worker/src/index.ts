/**
 * apps/worker — background job runner, event dispatcher, scheduled sweeps.
 *
 * Owns state: none. It executes jobs; it does not own business state.
 *
 * Event flow (technical_design/01): a command commits a `domain_events` row
 * in the same transaction (ADR-020, transactional outbox). The dispatcher
 * polls PENDING and marks PUBLISHED. Consumers read, record in
 * `event_consumers` for idempotency, then act. At-least-once delivery;
 * ordering is guaranteed per aggregate, never globally.
 *
 * Neither apps/web nor apps/worker imports the other. Both import the same
 * packages/domain and packages/db.
 *
 * Layout per technical_design/03:
 *   src/dispatch/    outbox dispatcher (technical_design/26)
 *   src/schedules/   cron-equivalent sweeps
 */
import { createPool } from '@maihan/db';

import { runWorkerLoop } from './loop.js';

function requireDatabaseUrl(): string {
  const url = process.env['DATABASE_URL']?.trim() ?? '';
  if (!url) {
    process.stderr.write('worker: DATABASE_URL is not set — refusing to start\n');
    process.exit(1);
  }
  return url;
}

async function main(): Promise<void> {
  const databaseUrl = requireDatabaseUrl();
  const intervalMs = Number(process.env['WORKER_INTERVAL_MS'] ?? '5000');
  const pool = createPool(databaseUrl);

  const stop = runWorkerLoop(pool, {
    intervalMs: Number.isFinite(intervalMs) && intervalMs > 250 ? intervalMs : 5000,
  });

  const shutdown = async (signal: string): Promise<void> => {
    process.stdout.write(`worker: ${signal} received — draining\n`);
    stop();
    await pool.end().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  process.stderr.write(`worker: fatal: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
