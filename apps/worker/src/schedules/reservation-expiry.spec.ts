/**
 * apps/worker/src/schedules/reservation-expiry.spec.ts
 *
 * The schedule must reuse the existing sweep rather than reimplement it, must
 * report what it released, and must stop on shutdown instead of running one
 * more pass.
 */
import { describe, expect, it } from 'vitest';

import { enqueueJob } from '@maihan/db';

import { ReservationExpirySchedule } from './reservation-expiry.js';
import { MemoryWorkerLogger } from '../dispatch/logger.js';
import { createFakeWorkerDb } from '../test/fake-db.js';

async function seedReservation(
  db: ReturnType<typeof createFakeWorkerDb>,
  gemstoneId: string,
): Promise<void> {
  await enqueueJob(db as never, {
    jobKey: `reservation:gemstone:${gemstoneId}`,
    queue: 'inventory_reservations',
    jobType: 'RELEASE_RESERVATION',
    payload: { sessionId: 'session-1', gemstoneId, gemRef: 'GEM-1' },
  });
}

describe('ReservationExpirySchedule', () => {
  it('releases expired reservations through sweepExpiredReservations', async () => {
    const db = createFakeWorkerDb();
    await seedReservation(db, '11111111-1111-4111-8111-111111111111');
    await seedReservation(db, '22222222-2222-4222-8222-222222222222');
    const logger = new MemoryWorkerLogger();
    const schedule = new ReservationExpirySchedule({
      db: db as never,
      logger,
      now: () => db.now,
    });

    const result = await schedule.runOnce();

    expect(result.released).toBe(2);
    expect(result.completedAt).toBe('2026-11-23T10:00:00.000Z');
    expect(db.jobs.every((job) => job.state === 'SUCCEEDED')).toBe(true);
    expect(logger.records.some((record) => record.event === 'schedule.reservation_expiry')).toBe(
      true,
    );
  });

  it('does not touch a reservation whose time has not come', async () => {
    const db = createFakeWorkerDb();
    await enqueueJob(db as never, {
      jobKey: 'reservation:gemstone:future',
      queue: 'inventory_reservations',
      jobType: 'RELEASE_RESERVATION',
      payload: { gemstoneId: 'future' },
      runAfter: new Date(db.now.getTime() + 60_000),
    });
    const schedule = new ReservationExpirySchedule({ db: db as never, now: () => db.now });

    const result = await schedule.runOnce();
    expect(result.released).toBe(0);
    expect(db.jobs[0]?.state).toBe('QUEUED');
  });

  it('runs nothing when the signal is already aborted', async () => {
    const db = createFakeWorkerDb();
    await seedReservation(db, '33333333-3333-4333-8333-333333333333');
    const schedule = new ReservationExpirySchedule({
      db: db as never,
      intervalMs: 1,
      now: () => db.now,
    });
    const controller = new AbortController();
    controller.abort();

    await schedule.run(controller.signal);
    expect(db.jobs[0]?.state).toBe('QUEUED');
  });
});
