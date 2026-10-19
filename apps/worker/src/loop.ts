/**
 * apps/worker/src/loop.ts
 *
 * The worker poll loop: dispatch the outbox, run the sweeps, then sleep.
 * Every tick is bounded and idempotent; errors are logged and never fatal
 * (a failed tick retries on the next interval). `stop()` ends the loop
 * after the current tick (graceful shutdown).
 */
import type { Pool } from '@maihan/db';

import { createCatalogDatabase } from './dispatch/catalog-db.js';
import { dispatchOutbox } from './dispatch/outbox.js';
import { runSweeps } from './schedules/sweeps.js';

export interface WorkerLoopOptions {
  readonly intervalMs: number;
}

export interface WorkerTickResult {
  published: number;
  retried: number;
  deadLettered: number;
  sweeps: Array<{ name: string; changed: number }>;
}

export function runWorkerLoop(
  pool: Pool,
  options: WorkerLoopOptions,
): () => void {
  const db = createCatalogDatabase(pool);
  let stopped = false;
  let ticking = false;

  async function tick(): Promise<void> {
    if (ticking) return;
    ticking = true;
    try {
      const outbox = await dispatchOutbox(db);
      const sweeps = await runSweeps(db);
      if (outbox.published > 0 || outbox.deadLettered > 0 || sweeps.some((s) => s.changed > 0)) {
        process.stdout.write(
          `worker: outbox published=${outbox.published} retried=${outbox.retried} dead-lettered=${outbox.deadLettered}; ` +
            sweeps.map((s) => `${s.name}=${s.changed}`).join(' ') +
            '\n',
        );
      }
    } catch (error) {
      process.stderr.write(
        `worker: tick failed (will retry): ${error instanceof Error ? error.message : String(error)}\n`,
      );
    } finally {
      ticking = false;
    }
  }

  function loop(): void {
    if (stopped) return;
    void tick().finally(() => {
      if (!stopped) setTimeout(loop, options.intervalMs).unref();
    });
  }

  loop();

  return () => {
    stopped = true;
  };
}
