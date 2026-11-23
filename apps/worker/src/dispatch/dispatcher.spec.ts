/**
 * apps/worker/src/dispatch/dispatcher.spec.ts
 *
 * The dispatch lifecycle, end to end, against an in-memory executor:
 *   - two dispatchers, one event: claimed once, one handler run, one email;
 *   - a redelivered event: the consumer ledger suppresses the second run and
 *     `job_key` suppresses the second job;
 *   - a failing handler: retried with backoff, then dead-lettered;
 *   - a permanent failure: dead-lettered on the first attempt;
 *   - shutdown: stops claiming, finishes the in-flight handler, leaves the
 *     rest for the lease to reclaim.
 */
import { describe, expect, it } from 'vitest';

import { EMAIL_SEND_JOB_TYPE, ORDER_CREATED } from '@maihan/contracts';

import { OutboxDispatcher } from './dispatcher.js';
import { PermanentDispatchError } from './errors.js';
import { JobRunner } from './job-runner.js';
import { HandlerRegistry, JobHandlerRegistry } from './registry.js';
import { createEmailJobEnqueuer } from '../handlers/email-jobs.js';
import { createEmailSendJobHandler } from '../handlers/email-send.js';
import { createOrderCreatedHandler } from '../handlers/order-created.js';
import type { OrderEmailFacts, OrderNotificationSource } from '../handlers/sources.js';
import { SinkEmailTransport } from '../email/sink-transport.js';
import { createFakeWorkerDb } from '../test/fake-db.js';

const ORDER_ID = '22222222-2222-4222-8222-222222222222';
const APP_BASE_URL = 'https://maihangems.example';

const ORDER_FACTS: OrderEmailFacts = {
  email: 'ada@example.com',
  displayName: 'Ada Lovelace',
  orderNumber: 'MG-2026-000123',
  currency: 'USD',
  grandTotal: '5218.00',
  placedAt: '2026-11-23T10:15:00.000Z',
  items: [{ title: 'Unheated Ceylon Sapphire', quantity: 1, lineTotal: '5218.00' }],
};

function orderSource(facts: OrderEmailFacts | null = ORDER_FACTS): OrderNotificationSource {
  return {
    async loadOrder(orderId: string): Promise<OrderEmailFacts | null> {
      return orderId === ORDER_ID ? facts : null;
    },
  };
}

function buildEmailPipeline(db: ReturnType<typeof createFakeWorkerDb>): {
  sink: SinkEmailTransport;
  eventHandlers: HandlerRegistry;
  jobHandlers: JobHandlerRegistry;
} {
  const sink = new SinkEmailTransport({ from: 'no-reply@maihan-gems.invalid', capacity: 10 });
  const emailJobs = createEmailJobEnqueuer(db as never);
  const eventHandlers = new HandlerRegistry().register(
    createOrderCreatedHandler({ orders: orderSource(), emailJobs, appBaseUrl: APP_BASE_URL }),
  );
  const jobHandlers = new JobHandlerRegistry().register(
    EMAIL_SEND_JOB_TYPE,
    createEmailSendJobHandler({ email: sink }),
  );
  return { sink, eventHandlers, jobHandlers };
}

describe('OutboxDispatcher — exactly-once effect', () => {
  it('two dispatchers and two runners deliver ONE email for ONE event', async () => {
    const db = createFakeWorkerDb();
    db.addEvent({ eventType: ORDER_CREATED, payload: { order_id: ORDER_ID } });
    const { sink, eventHandlers, jobHandlers } = buildEmailPipeline(db);

    const dispatcherA = new OutboxDispatcher({ db: db as never, registry: eventHandlers, idleDelayMs: 1 });
    const dispatcherB = new OutboxDispatcher({ db: db as never, registry: eventHandlers, idleDelayMs: 1 });

    const [a, b] = await Promise.all([dispatcherA.runOnce(), dispatcherB.runOnce()]);
    expect(a.claimed + b.claimed).toBe(1);
    expect(db.jobs).toHaveLength(1);

    const runnerA = new JobRunner({
      db: db as never,
      registry: jobHandlers,
      workerId: 'worker-a',
      queues: ['default'],
      idleDelayMs: 1,
    });
    const runnerB = new JobRunner({
      db: db as never,
      registry: jobHandlers,
      workerId: 'worker-b',
      queues: ['default'],
      idleDelayMs: 1,
    });

    const [ja, jb] = await Promise.all([runnerA.runOnce(), runnerB.runOnce()]);
    expect(ja.claimed + jb.claimed).toBe(1);
    expect(ja.succeeded + jb.succeeded).toBe(1);

    expect(sink.size).toBe(1);
    expect(sink.messages()[0]?.to).toBe('ada@example.com');
    expect(sink.messages()[0]?.subject).toBe('Order MG-2026-000123 confirmed');
    expect(db.events[0]?.status).toBe('PUBLISHED');
    expect(db.jobs[0]?.state).toBe('SUCCEEDED');
    expect(db.consumers.size).toBe(1);
  });

  it('a redelivered event is suppressed by the consumer ledger and the job key', async () => {
    const db = createFakeWorkerDb();
    const event = db.addEvent({ eventType: ORDER_CREATED, payload: { order_id: ORDER_ID } });
    const { sink, eventHandlers, jobHandlers } = buildEmailPipeline(db);
    const dispatcher = new OutboxDispatcher({ db: db as never, registry: eventHandlers, idleDelayMs: 1 });
    const runner = new JobRunner({
      db: db as never,
      registry: jobHandlers,
      workerId: 'worker-a',
      queues: ['default'],
      idleDelayMs: 1,
    });

    await dispatcher.runOnce();
    await runner.runOnce();
    expect(sink.size).toBe(1);

    // Replay the same event exactly as an outbox replay would.
    event.status = 'PENDING';
    event.availableAt = db.now;
    event.attempts = 0;

    const replay = await dispatcher.runOnce();
    expect(replay.published).toBe(1);
    expect(replay.duplicates).toBe(1);
    expect(db.jobs).toHaveLength(1);

    await runner.runOnce();
    expect(sink.size).toBe(1);
  });

  it('a duplicate job_key never creates a second job, even with a different payload', async () => {
    const db = createFakeWorkerDb();
    const emailJobs = createEmailJobEnqueuer(db as never);
    const request = {
      kind: 'vendor_approved' as const,
      recipient: { email: 'vendor@example.com' },
      data: { vendorName: 'Ceylon House', portalUrl: 'https://maihangems.example/vendor' },
    };
    const first = await emailJobs.enqueueEmail('email.vendor_approved:v1', request);
    const second = await emailJobs.enqueueEmail('email.vendor_approved:v1', {
      ...request,
      data: { ...request.data, vendorName: 'Someone Else' },
    });

    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
    expect(db.jobs).toHaveLength(1);
    expect((db.jobs[0]?.payload as { data: { vendorName: string } }).data.vendorName).toBe(
      'Ceylon House',
    );
  });
});

describe('OutboxDispatcher — failure handling', () => {
  it('retries with exponential backoff and dead-letters at the ceiling', async () => {
    const db = createFakeWorkerDb();
    const event = db.addEvent({ eventType: 'OrderCreated', payload: {} });
    let calls = 0;
    const registry = new HandlerRegistry().register({
      consumerName: 'test.always_fails',
      eventTypes: ['OrderCreated'],
      async handle(): Promise<void> {
        calls += 1;
        throw new Error('smtp timeout for ada@example.com');
      },
    });
    const dispatcher = new OutboxDispatcher({
      db: db as never,
      registry,
      maxAttempts: 3,
      backoff: { baseMs: 1_000, maxMs: 60_000, jitterRatio: 0 },
      random: () => 0.5,
      idleDelayMs: 1,
    });

    const first = await dispatcher.runOnce();
    expect(first.failed).toBe(1);
    expect(event.status).toBe('FAILED');
    expect(event.attempts).toBe(1);
    expect(event.availableAt.getTime() - db.now.getTime()).toBe(1_000);
    // The stored error is redacted: a dead-letter row inherits the no-PII rule.
    expect(event.lastError).toContain('smtp timeout');
    expect(event.lastError).not.toContain('ada@example.com');

    db.advance(1_000);
    const second = await dispatcher.runOnce();
    expect(second.failed).toBe(1);
    expect(event.attempts).toBe(2);
    expect(event.availableAt.getTime() - db.now.getTime()).toBe(2_000);

    db.advance(2_000);
    const third = await dispatcher.runOnce();
    expect(third.deadLettered).toBe(1);
    expect(event.status).toBe('DEAD_LETTER');
    expect(event.attempts).toBe(3);

    db.advance(600_000);
    const fourth = await dispatcher.runOnce();
    expect(fourth.claimed).toBe(0);
    expect(calls).toBe(3);
  });

  it('dead-letters a permanent failure on the first attempt', async () => {
    const db = createFakeWorkerDb();
    const event = db.addEvent({ eventType: 'OrderCreated', payload: {} });
    const registry = new HandlerRegistry().register({
      consumerName: 'test.poison',
      eventTypes: ['OrderCreated'],
      async handle(): Promise<void> {
        throw new PermanentDispatchError('payload does not match its schema (order_id)');
      },
    });
    const dispatcher = new OutboxDispatcher({
      db: db as never,
      registry,
      maxAttempts: 5,
      idleDelayMs: 1,
    });

    const pass = await dispatcher.runOnce();
    expect(pass.deadLettered).toBe(1);
    expect(event.status).toBe('DEAD_LETTER');
    expect(event.attempts).toBe(1);
  });

  it('does not re-run a consumer that already succeeded when a sibling consumer failed', async () => {
    const db = createFakeWorkerDb();
    const event = db.addEvent({ eventType: 'OrderCreated', payload: {} });
    let aCalls = 0;
    let bCalls = 0;
    const registry = new HandlerRegistry()
      .register({
        consumerName: 'test.consumer_a',
        eventTypes: ['OrderCreated'],
        async handle(): Promise<void> {
          aCalls += 1;
        },
      })
      .register({
        consumerName: 'test.consumer_b',
        eventTypes: ['OrderCreated'],
        async handle(): Promise<void> {
          bCalls += 1;
          if (bCalls === 1) throw new Error('transient');
        },
      });
    const dispatcher = new OutboxDispatcher({
      db: db as never,
      registry,
      backoff: { baseMs: 1_000, maxMs: 60_000, jitterRatio: 0 },
      random: () => 0.5,
      idleDelayMs: 1,
    });

    await dispatcher.runOnce();
    expect(aCalls).toBe(1);
    expect(bCalls).toBe(1);
    expect(event.status).toBe('FAILED');

    db.advance(1_000);
    const second = await dispatcher.runOnce();
    expect(second.published).toBe(1);
    expect(aCalls).toBe(1);
    expect(bCalls).toBe(2);
    expect(event.status).toBe('PUBLISHED');
  });

  it('publishes an event with no consumer in this worker, and says so', async () => {
    const db = createFakeWorkerDb();
    const event = db.addEvent({ eventType: 'ProductUpdated', payload: { product_id: 'x' } });
    const dispatcher = new OutboxDispatcher({
      db: db as never,
      registry: new HandlerRegistry(),
      idleDelayMs: 1,
    });

    const pass = await dispatcher.runOnce();
    expect(pass.published).toBe(1);
    expect(event.status).toBe('PUBLISHED');
    expect(db.consumers.size).toBe(0);
  });
});

describe('OutboxDispatcher — shutdown', () => {
  it('stops claiming, finishes the in-flight handler, and resolves', async () => {
    const db = createFakeWorkerDb();
    for (let index = 0; index < 3; index += 1) {
      db.addEvent({ eventType: 'OrderCreated', payload: { order_id: ORDER_ID } });
    }

    const controller = new AbortController();
    const completed: string[] = [];
    const registry = new HandlerRegistry().register({
      consumerName: 'test.shutdown',
      eventTypes: ['OrderCreated'],
      async handle(event): Promise<void> {
        // Yield once so the abort happens while this handler is in flight.
        await Promise.resolve();
        completed.push(event.eventId);
        controller.abort();
      },
    });
    const dispatcher = new OutboxDispatcher({
      db: db as never,
      registry,
      batchSize: 10,
      idleDelayMs: 5,
    });

    await dispatcher.run(controller.signal);

    expect(completed).toHaveLength(1);
    expect(db.claimCount).toBe(1);
    expect(db.events.filter((event) => event.status === 'PUBLISHED')).toHaveLength(1);
    expect(db.events.filter((event) => event.status === 'PENDING')).toHaveLength(2);
  });

  it('does not start a batch when already aborted', async () => {
    const db = createFakeWorkerDb();
    db.addEvent({ eventType: 'OrderCreated', payload: { order_id: ORDER_ID } });
    const dispatcher = new OutboxDispatcher({
      db: db as never,
      registry: new HandlerRegistry(),
      idleDelayMs: 1,
    });
    const controller = new AbortController();
    controller.abort();

    await dispatcher.run(controller.signal);
    expect(db.claimCount).toBe(0);
    expect(db.events[0]?.status).toBe('PENDING');
  });
});
