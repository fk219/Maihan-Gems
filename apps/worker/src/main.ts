/**
 * apps/worker/src/main.ts
 *
 * Process entry. Composition only: configuration, pool, ports, registries,
 * loops, signals.
 *
 * Shutdown contract (technical_design/27 §8, AGENTS.md §10 "fail closed"):
 *
 *   SIGTERM / SIGINT
 *     → abort the shared signal (both loops stop CLAIMING immediately)
 *     → each loop finishes the event/job it is already handling
 *     → the reservation sweep finishes its current pass
 *     → the pool is drained
 *     → exit 0
 *
 * A second signal is left to the runtime default, which terminates the process:
 * an operator who sends two signals wants it dead, not politely wound down.
 */
import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { pathToFileURL } from 'node:url';

import { ConfigError, isProductionEnvironment, loadRuntimeConfig, type RuntimeConfig } from '@maihan/config';
import { createCatalogDatabase, createPool, type CatalogDatabase } from '@maihan/db';
import { createLogger } from '@maihan/observability';

import { JobRunner, OutboxDispatcher, type WorkerLogger } from './dispatch/index.js';
import { createEmailPort, type EmailPort } from './email/index.js';
import { createHandlerRegistry, createJobHandlerRegistry } from './handlers/index.js';
import { ReservationExpirySchedule } from './schedules/index.js';

/**
 * Only `default` is served. `critical` is deliberately NOT served by this
 * worker: it carries payment reconciliation, payments are not built, and a
 * `critical` job with no handler would be dead-lettered by a worker that had no
 * business touching it.
 */
const SERVED_QUEUES = Object.freeze(['default']);

export interface WorkerOptions {
  readonly config: RuntimeConfig;
  readonly db: CatalogDatabase;
  readonly logger?: WorkerLogger;
  readonly email?: EmailPort;
  readonly workerId?: string;
}

export interface WorkerRuntime {
  readonly dispatcher: OutboxDispatcher;
  readonly jobRunner: JobRunner;
  readonly reservationExpiry: ReservationExpirySchedule;
  readonly workerId: string;
  /** Resolves after both loops and the schedule have stopped. */
  run(signal: AbortSignal): Promise<void>;
}

/**
 * Email links must not point at a developer machine in production. The check
 * lives here rather than in `@maihan/config` because apps/web shares that
 * config and must not gain a new mandatory production variable.
 */
export function assertUsableAppBaseUrl(config: RuntimeConfig): void {
  if (!isProductionEnvironment(config.environment)) return;
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/?$/i.test(config.appBaseUrl)) {
    throw new ConfigError('APP_BASE_URL', 'must not point at localhost in production');
  }
}

export function createWorker(options: WorkerOptions): WorkerRuntime {
  const { config, db } = options;
  assertUsableAppBaseUrl(config);
  const logger =
    options.logger ?? createLogger('worker', { environment: config.environment, actorType: 'SYSTEM' });
  const email = options.email ?? createEmailPort(config.email);
  const workerId =
    options.workerId ?? `${hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`;

  const dispatcher = new OutboxDispatcher({
    db,
    registry: createHandlerRegistry({ db, email, appBaseUrl: config.appBaseUrl }),
    logger,
  });

  const jobRunner = new JobRunner({
    db,
    registry: createJobHandlerRegistry({ email }),
    workerId,
    queues: SERVED_QUEUES,
    logger,
  });

  const reservationExpiry = new ReservationExpirySchedule({ db, logger });

  return {
    dispatcher,
    jobRunner,
    reservationExpiry,
    workerId,
    async run(signal: AbortSignal): Promise<void> {
      await Promise.all([
        dispatcher.run(signal),
        jobRunner.run(signal),
        reservationExpiry.run(signal),
      ]);
    },
  };
}

/** Load configuration, open the pool, run until signalled, drain, return 0. */
export async function main(): Promise<number> {
  const config = loadRuntimeConfig();
  const logger = createLogger('worker', {
    environment: config.environment,
    actorType: 'SYSTEM',
  });
  const pool = createPool(config.databaseUrl, { max: 5 });
  const db = createCatalogDatabase(pool);

  const controller = new AbortController();
  const requestStop = (signal: string): void => {
    logger.info('worker.shutdown_requested', 'Shutdown requested; finishing in-flight work', {
      signal,
    });
    controller.abort();
  };
  process.once('SIGTERM', () => requestStop('SIGTERM'));
  process.once('SIGINT', () => requestStop('SIGINT'));

  try {
    const worker = createWorker({ config, db, logger });
    logger.info('worker.started', 'Worker started', {
      worker_id: worker.workerId,
      email_transport: config.email.transport,
      queues: SERVED_QUEUES,
    });
    await worker.run(controller.signal);
    logger.info('worker.stopped', 'Worker stopped cleanly');
    return 0;
  } finally {
    await pool.end();
  }
}

const entryPoint = process.argv[1];
if (entryPoint !== undefined && import.meta.url === pathToFileURL(entryPoint).href) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      // The logger may not exist yet (configuration can throw), so the fatal
      // path writes to stderr directly. No secrets, no payloads: name only.
      const name = error instanceof Error ? error.name : 'Error';
      const message = error instanceof Error ? error.message : 'unknown failure';
      process.stderr.write(`[worker] fatal: ${name}: ${message}\n`);
      process.exitCode = 1;
    });
}
