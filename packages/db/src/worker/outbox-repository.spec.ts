/**
 * packages/db/src/worker/outbox-repository.spec.ts
 *
 * No database. Each statement is captured with placeholders intact, so the
 * suite proves the properties that matter and that a fake cannot fake:
 *   - claiming is `FOR UPDATE SKIP LOCKED` with a lease, in ONE statement;
 *   - limits and leases are bound parameters, never interpolated;
 *   - a failed publish either retries with a bound backoff or dead-letters at
 *     the configured attempt ceiling;
 *   - the consumer ledger is an `ON CONFLICT DO NOTHING` insert keyed on the
 *     BIGINT identity, not the UUID.
 */
import { describe, expect, it } from 'vitest';

import { createScriptedExecutor } from '../test/sql-capture.js';
import {
  claimOutboxBatch,
  getOutboxHealth,
  markOutboxFailed,
  markOutboxPublished,
  recordEventConsumer,
  redactErrorText,
} from './outbox-repository.js';

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '41',
    event_id: '11111111-1111-4111-8111-111111111111',
    event_type: 'OrderCreated',
    aggregate_type: 'order',
    aggregate_id: '22222222-2222-4222-8222-222222222222',
    aggregate_version: 1,
    payload: { order_id: '22222222-2222-4222-8222-222222222222' },
    trace_id: null,
    status: 'PENDING',
    attempts: 1,
    last_error: null,
    occurred_at: '2026-11-23T10:00:00.000Z',
    available_at: '2026-11-23T10:00:30.000Z',
    published_at: null,
    ...overrides,
  };
}

describe('claimOutboxBatch', () => {
  it('claims with FOR UPDATE SKIP LOCKED and a lease in one statement', async () => {
    const db = createScriptedExecutor([[row()]]);
    const claimed = await claimOutboxBatch(db as never, { limit: 10, leaseMs: 30_000 });

    expect(claimed).toHaveLength(1);
    const query = db.queries[0];
    expect(query).toBeDefined();
    expect(query?.text).toContain('FOR UPDATE SKIP LOCKED');
    expect(query?.text).toContain("status IN ('PENDING', 'FAILED')");
    expect(query?.text).toContain('available_at <= now()');
    expect(query?.text).toContain('attempts = attempts + 1');
    expect(query?.text).toContain('ORDER BY id');
    // Both dynamic values are bound, in order: lease then limit.
    expect(query?.values).toEqual([30_000, 10]);
    expect(query?.text).not.toContain('30000');
    expect(query?.text).not.toContain('LIMIT 10');
  });

  it('clamps an absurd limit and a non-finite lease instead of trusting the caller', async () => {
    const db = createScriptedExecutor([[], []]);
    await claimOutboxBatch(db as never, { limit: 1_000_000, leaseMs: Number.NaN });
    await claimOutboxBatch(db as never, { limit: 0, leaseMs: 1 });
    expect(db.queries[0]?.values).toEqual([30_000, 500]);
    expect(db.queries[1]?.values).toEqual([1_000, 1]);
  });

  it('returns an empty batch when nothing is due', async () => {
    const db = createScriptedExecutor([[]]);
    await expect(claimOutboxBatch(db as never)).resolves.toEqual([]);
  });
});

describe('markOutboxPublished', () => {
  it('sets PUBLISHED and published_at only once', async () => {
    const db = createScriptedExecutor([
      [{ id: '41', published_at: '2026-11-23T10:00:01.000Z' }],
      [],
    ]);
    const first = await markOutboxPublished(db as never, '41');
    const second = await markOutboxPublished(db as never, '41');

    expect(first?.id).toBe('41');
    expect(second).toBeNull();
    expect(db.queries[0]?.text).toContain("status = 'PUBLISHED'");
    expect(db.queries[0]?.text).toContain("AND status <> 'PUBLISHED'");
    expect(db.queries[0]?.values).toEqual(['41']);
  });
});

describe('markOutboxFailed', () => {
  it('retries with a bound backoff and keeps the row dispatchable', async () => {
    const db = createScriptedExecutor([[{ id: '41', status: 'FAILED', attempts: 2 }]]);
    const result = await markOutboxFailed(db as never, {
      eventRowId: '41',
      error: 'smtp timeout',
      backoffMs: 4_000,
      maxAttempts: 5,
    });

    expect(result).toEqual({ id: '41', status: 'FAILED', attempts: 2 });
    const query = db.queries[0];
    expect(query?.text).toContain("ELSE 'FAILED'");
    expect(query?.text).toContain('attempts >= $2');
    // A late failure must not downgrade an event another worker published.
    expect(query?.text).toContain("AND status <> 'PUBLISHED'");
    expect(query?.values.slice(0, 5)).toEqual([true, 5, 'smtp timeout', true, 5]);
    expect(query?.values[5]).toBe(4_000);
    expect(query?.text).not.toContain('smtp timeout');
  });

  it('dead-letters immediately when the failure is not retryable', async () => {
    const db = createScriptedExecutor([[{ id: '41', status: 'DEAD_LETTER', attempts: 1 }]]);
    const result = await markOutboxFailed(db as never, {
      eventRowId: '41',
      error: 'payload did not parse',
      retryable: false,
      backoffMs: 1_000,
    });

    expect(result?.status).toBe('DEAD_LETTER');
    expect(db.queries[0]?.values[0]).toBe(false);
    expect(db.queries[0]?.text).toContain("'DEAD_LETTER'");
  });

  it('defaults the ceiling to five attempts (technical_design/26 §9)', async () => {
    const db = createScriptedExecutor([[{ id: '41', status: 'FAILED', attempts: 2 }]]);
    await markOutboxFailed(db as never, {
      eventRowId: '41',
      error: 'boom',
      backoffMs: 1_000,
    });
    expect(db.queries[0]?.values[1]).toBe(5);
  });
});

describe('event consumer ledger', () => {
  it('records on the BIGINT identity with ON CONFLICT DO NOTHING', async () => {
    const db = createScriptedExecutor([[{ consumer_name: 'notification.order' }], []]);
    const first = await recordEventConsumer(db as never, {
      consumerName: 'notification.order',
      eventRowId: '41',
    });
    const second = await recordEventConsumer(db as never, {
      consumerName: 'notification.order',
      eventRowId: '41',
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(db.queries[0]?.text).toContain('INSERT INTO event_consumers');
    expect(db.queries[0]?.text).toContain('ON CONFLICT (consumer_name, event_id) DO NOTHING');
    expect(db.queries[0]?.values).toEqual(['notification.order', '41']);
    expect(db.queries[0]?.text).not.toContain('notification.order');
  });
});

describe('getOutboxHealth', () => {
  it('reports unpublished count and oldest age without PII', async () => {
    const db = createScriptedExecutor([
      [{ unpublished: '7', dead_lettered: '1', oldest_age_ms: '42000.7' }],
    ]);
    await expect(getOutboxHealth(db as never)).resolves.toEqual({
      unpublished: 7,
      deadLettered: 1,
      oldestUnpublishedAgeMs: 42_001,
    });
  });

  it('reports a null age when the outbox is empty', async () => {
    const db = createScriptedExecutor([
      [{ unpublished: '0', dead_lettered: '0', oldest_age_ms: null }],
    ]);
    const health = await getOutboxHealth(db as never);
    expect(health.oldestUnpublishedAgeMs).toBeNull();
  });
});

describe('redactErrorText', () => {
  it('redacts an address that a careless throw interpolated', () => {
    expect(redactErrorText('delivery to ada@example.com failed')).toBe(
      'delivery to [REDACTED_EMAIL] failed',
    );
  });

  it('strips control characters and caps the length', () => {
    const text = redactErrorText(`a\u0000b\u001bc${'x'.repeat(3_000)}`);
    expect(text).toBe(`abc${'x'.repeat(1_997)}`);
    expect(text).toHaveLength(2_000);
  });
});
