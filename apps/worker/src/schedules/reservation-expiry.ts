/**
 * apps/worker/src/schedules/reservation-expiry.ts
 *
 * The nightly reservation sweep (technical_design/27 §6). An unreleased
 * reservation is an oversold stone, so this is not cosmetic maintenance.
 *
 * The sweep itself is NOT reimplemented here: `sweepExpiredReservations` from
 * `@maihan/db` already marks expired reservation jobs SUCCEEDED and emits the
 * `InventoryReleased` outbox event. This module only decides WHEN it runs and
 * reports what happened.
 *
 * The loop is interruptible: shutdown stops the timer, never mid-sweep.
 */
import { sweepExpiredReservations, type CatalogDatabase } from '@maihan/db';

import { delay } from '../dispatch/delay.js';
import { describeFailure } from '../dispatch/errors.js';
import { SILENT_LOGGER, type WorkerLogger } from '../dispatch/logger.js';

export interface ReservationExpirySweepResult {
  readonly released: number;
  readonly completedAt: string;
}

export interface ReservationExpiryScheduleOptions {
  readonly db: CatalogDatabase;
  readonly logger?: WorkerLogger;
  /** Default 15 minutes. */
  readonly intervalMs?: number;
  readonly now?: () => Date;
}

export class ReservationExpirySchedule {
  private readonly db: CatalogDatabase;
  private readonly logger: WorkerLogger;
  private readonly intervalMs: number;
  private readonly now: () => Date;

  constructor(options: ReservationExpiryScheduleOptions) {
    this.db = options.db;
    this.logger = options.logger ?? SILENT_LOGGER;
    this.intervalMs = options.intervalMs ?? 15 * 60_000;
    this.now = options.now ?? (() => new Date());
  }

  /** One sweep. Throws on a database error; the loop decides whether to retry. */
  async runOnce(): Promise<ReservationExpirySweepResult> {
    const released = await sweepExpiredReservations(this.db);
    const result: ReservationExpirySweepResult = {
      released: released.length,
      completedAt: this.now().toISOString(),
    };
    this.logger.info('schedule.reservation_expiry', 'Reservation expiry sweep completed', {
      released: result.released,
    });
    return result;
  }

  async run(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      try {
        await this.runOnce();
      } catch (error) {
        // A failed sweep must not stop the worker; the next tick retries it.
        this.logger.error('schedule.reservation_expiry_failed', 'Reservation expiry sweep failed', {
          error: describeFailure(error),
        });
      }
      await delay(this.intervalMs, signal);
    }
    this.logger.info('schedule.stopped', 'Reservation expiry schedule stopped');
  }
}
