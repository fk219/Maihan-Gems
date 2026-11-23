/**
 * apps/worker/src/dispatch/job-runner.spec.ts
 *
 * The job queue lifecycle: claim → handler → complete, or fail with backoff.
 * The cases that matter operationally are all here: a poison payload, a
 * transient failure, no handler, a lost lease, and shutdown mid-batch.
 */
import { describe, expect, it } from 'vitest';

import { EMAIL_SEND_JOB_TYPE } from '@maihan/contracts';

import { JobRunner } from './job-runner.js';
import { PermanentJobError } from './errors.js';
import { JobHandlerRegistry } from './registry.js';
import { createEmailSendJobHandler } from '../handlers/email-send.js';
import { SinkEmailTransport } from '../email/sink-transport.js';
import { createFakeWorkerDb } from '../test/fake-db.js';
import { enqueueJob } from '@maihan/db';

const BACKOFF = { baseMs: 1_000, maxMs: 60_000, jitterRatio: 0 };

function runner(
  db: ReturnType<typeof createFakeWorkerDb>,
  registry: JobHandlerRegistry,
  workerId = 'worker-a',
): JobRunner {
  return new JobRunner({
    db: db as never,
    registry,
    workerId,
    queues: ['default'],
    backoff: BACKOFF,
    random: () => 0.5,
    idleDelayMs: 1,
  });
}

describe('JobRunner', () => {
  it('completes a job and records the result', async () => {
    const db = createFakeWorkerDb();
    await enqueueJob(db as never, {
      jobKey: 'email.vendor_approved:v1',
      queue: 'default',
      jobType: 'TEST_JOB',
    });
    const registry = new JobHandlerRegistry().register('TEST_JOB', async () => {});
    const pass = await runner(db, registry).runOnce();

    expect(pass.succeeded).toBe(1);
    expect(db.jobs[0]?.state).toBe('SUCCEEDED');
    expect(db.jobs[0]?.attempts).toBe(1);
  });

  it('retries a transient failure with backoff and dead-letters at max_attempts', async () => {
    const db = createFakeWorkerDb();
    await enqueueJob(db as never, {
      jobKey: 'job.transient',
      queue: 'default',
      jobType: 'TEST_JOB',
      maxAttempts: 2,
    });
    const registry = new JobHandlerRegistry().register('TEST_JOB', async () => {
      throw new Error('relay refused the connection');
    });
    const jobRunner = runner(db, registry);

    const first = await jobRunner.runOnce();
    expect(first.failed).toBe(1);
    expect(db.jobs[0]?.state).toBe('FAILED');
    expect(db.jobs[0]?.runAfter.getTime()).toBe(db.now.getTime() + 1_000);

    db.advance(1_000);
    const second = await jobRunner.runOnce();
    expect(second.deadLettered).toBe(1);
    expect(db.jobs[0]?.state).toBe('DEAD_LETTER');
    expect(db.jobs[0]?.attempts).toBe(2);
    expect(db.jobs[0]?.lastError).toContain('relay refused');

    db.advance(600_000);
    expect((await jobRunner.runOnce()).claimed).toBe(0);
  });

  it('dead-letters a permanent failure on the first attempt', async () => {
    const db = createFakeWorkerDb();
    await enqueueJob(db as never, { queue: 'default', jobType: 'TEST_JOB', maxAttempts: 5 });
    const registry = new JobHandlerRegistry().register('TEST_JOB', async () => {
      throw new PermanentJobError('payload does not match its schema (kind)');
    });
    const pass = await runner(db, registry).runOnce();

    expect(pass.deadLettered).toBe(1);
    expect(db.jobs[0]?.state).toBe('DEAD_LETTER');
    expect(db.jobs[0]?.attempts).toBe(1);
  });

  it('dead-letters a job with no handler instead of leaving it running', async () => {
    const db = createFakeWorkerDb();
    await enqueueJob(db as never, { queue: 'default', jobType: 'UNKNOWN_JOB' });
    const pass = await runner(db, new JobHandlerRegistry()).runOnce();

    expect(pass.deadLettered).toBe(1);
    expect(db.jobs[0]?.state).toBe('DEAD_LETTER');
  });

  it('dead-letters an invalid email payload before the transport is touched', async () => {
    const db = createFakeWorkerDb();
    const sink = new SinkEmailTransport({ from: 'no-reply@maihan-gems.invalid' });
    await enqueueJob(db as never, {
      jobKey: 'email.invalid',
      queue: 'default',
      jobType: EMAIL_SEND_JOB_TYPE,
      payload: { kind: 'order_confirmation', recipient: { email: 'not-an-address' } },
    });
    const registry = new JobHandlerRegistry().register(
      EMAIL_SEND_JOB_TYPE,
      createEmailSendJobHandler({ email: sink }),
    );

    const pass = await runner(db, registry).runOnce();
    expect(pass.deadLettered).toBe(1);
    expect(sink.size).toBe(0);
    expect(db.jobs[0]?.state).toBe('DEAD_LETTER');
  });

  it('does not overwrite a result when its lease was reclaimed', async () => {
    const db = createFakeWorkerDb();
    await enqueueJob(db as never, { jobKey: 'job.lease', queue: 'default', jobType: 'TEST_JOB' });

    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let signalStart: () => void = () => {};
    const started = new Promise<void>((resolve) => {
      signalStart = resolve;
    });
    let invocations = 0;
    const registry = new JobHandlerRegistry().register('TEST_JOB', async () => {
      invocations += 1;
      if (invocations === 1) {
        signalStart();
        await gate;
      }
    });

    const workerA = new JobRunner({
      db: db as never,
      registry,
      workerId: 'worker-a',
      queues: ['default'],
      leaseMs: 1_000,
      idleDelayMs: 1,
    });
    const workerB = new JobRunner({
      db: db as never,
      registry,
      workerId: 'worker-b',
      queues: ['default'],
      leaseMs: 1_000,
      idleDelayMs: 1,
    });

    const aPromise = workerA.runOnce();
    // Wait until worker A is inside its handler, holding the lease.
    await started;

    db.advance(2_000);
    const bResult = await workerB.runOnce();
    expect(bResult.succeeded).toBe(1);

    release();
    const aResult = await aPromise;
    expect(aResult.leaseLost).toBe(1);
    expect(db.jobs[0]?.state).toBe('SUCCEEDED');
    expect(db.jobs[0]?.lockedBy).toBeNull();
  });

  it('stops claiming on shutdown and leaves unstarted claims to the lease', async () => {
    const db = createFakeWorkerDb();
    for (let index = 0; index < 3; index += 1) {
      await enqueueJob(db as never, {
        jobKey: `job.shutdown.${index}`,
        queue: 'default',
        jobType: 'TEST_JOB',
      });
    }

    const controller = new AbortController();
    const completed: string[] = [];
    const registry = new JobHandlerRegistry().register('TEST_JOB', async (job) => {
      await Promise.resolve();
      completed.push(job.id);
      controller.abort();
    });

    await runner(db, registry).run(controller.signal);

    expect(completed).toHaveLength(1);
    expect(db.jobClaimCount).toBe(1);
    expect(db.jobs.filter((job) => job.state === 'SUCCEEDED')).toHaveLength(1);
    // The two claimed-but-not-started jobs stay RUNNING; their lease expires
    // and another worker reclaims them.
    expect(db.jobs.filter((job) => job.state === 'RUNNING')).toHaveLength(2);
  });

  it('does not claim when the queue list is empty', async () => {
    const db = createFakeWorkerDb();
    await enqueueJob(db as never, { queue: 'critical', jobType: 'TEST_JOB' });
    const jobRunner = new JobRunner({
      db: db as never,
      registry: new JobHandlerRegistry().register('TEST_JOB', async () => {}),
      workerId: 'worker-a',
      queues: [],
      idleDelayMs: 1,
    });
    expect((await jobRunner.runOnce()).claimed).toBe(0);
    expect(db.jobClaimCount).toBe(0);
  });
});
