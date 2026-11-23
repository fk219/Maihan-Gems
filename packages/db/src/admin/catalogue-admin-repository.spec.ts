/**
 * packages/db/src/admin/catalogue-admin-repository.spec.ts
 *
 * No database. The suite pins the bulk-edit contract (Track C1):
 *   - a batch over 200 ids is refused before any read;
 *   - a dry run issues exactly one SELECT and no write;
 *   - a SET never touches an UNKNOWN-evidence price, and no statement in this
 *     module ever writes `price_evidence`;
 *   - a bulk publish still honours gate V15 and the terminal ARCHIVED rule;
 *   - the apply writes one audit row per changed product and one
 *     `bulk_operation` row in the SAME statement;
 *   - undo is refused outside the 30-minute window, refused a second time,
 *     and refused when a row changed since (the statement gate);
 *   - undo reverses exactly the recorded rows and writes an append-only
 *     marker, never a DELETE.
 *
 * The executor is scripted: each statement returns a canned result and every
 * statement is captured as `{ text, values }`, so the assertions prove the
 * values are BOUND and the forbidden columns never appear in the SQL text.
 */
import { describe, expect, it } from 'vitest';

import { createScriptedExecutor } from '../test/sql-capture.js';
import {
  BULK_MAX_PRODUCTS,
  BULK_UNDO_WINDOW_MINUTES,
  bulkSetState,
  bulkUpdatePrices,
  centsToPrice,
  listRecentBulkOperations,
  planPriceUpdate,
  planStateSet,
  priceToCents,
  undoBulkOperation,
  type BulkTargetProduct,
} from './catalogue-admin-repository.js';

const ACTOR_ID = '44444444-4444-4444-8444-444444444444';
const OPERATION_ID = '55555555-5555-4555-8555-555555555555';

function uuid(index: number): string {
  return `33333333-3333-4333-8333-${String(index).padStart(12, '0')}`;
}

function targetRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: uuid(1),
    slug: 'oval-blue-sapphire-ring-js1409-w18-k1161',
    title: 'Oval Blue Sapphire Ring',
    state: 'DRAFT',
    price_amount: '1250.00',
    price_evidence: 'OBSERVED',
    published_at: null,
    ...overrides,
  };
}

function ids(count: number): string[] {
  return Array.from({ length: count }, (_, index) => uuid(index + 1));
}

function writtenOperation(rows: readonly Record<string, unknown>[]): Record<string, unknown> {
  return {
    operation_id: OPERATION_ID,
    created_at: '2026-11-23T10:00:00.000Z',
    undo_expires_at: '2026-11-23T10:30:00.000Z',
    changed: rows,
  };
}

function operationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    operation_id: OPERATION_ID,
    action: 'BULK_PRICE_UPDATE',
    after_state: {
      rows: [
        {
          product_id: uuid(1),
          slug: 'oval-blue-sapphire-ring-js1409-w18-k1161',
          before: { price_amount: '1250.00', state: 'DRAFT', published_at: null },
          after: { price_amount: '1125.00', state: 'DRAFT', published_at: null },
        },
      ],
    },
    created_at: '2026-11-23T10:00:00.000Z',
    within_window: true,
    already_undone: false,
    ...overrides,
  };
}

describe('bulk price arithmetic', () => {
  it('converts between the NUMERIC text form and integer cents without drift', () => {
    expect(priceToCents('1250.00')).toBe(125000n);
    expect(priceToCents('0.05')).toBe(5n);
    expect(priceToCents('99.5')).toBe(9950n);
    expect(centsToPrice(125000n)).toBe('1250.00');
    expect(centsToPrice(5n)).toBe('0.05');
  });

  it('applies a negative percentage with half-up rounding', () => {
    const plan = planPriceUpdate(
      [targetRow({ price_amount: '99.99' }) as unknown as BulkTargetProduct],
      'ADJUST_PERCENT',
      -10,
    );
    expect(plan.rows[0]).toMatchObject({
      outcome: 'CHANGED',
      after: { priceAmount: '89.99' },
    });
  });
});

describe('bulkUpdatePrices — bounds', () => {
  it('refuses more than 200 ids before reading anything', async () => {
    const db = createScriptedExecutor([]);

    await expect(
      bulkUpdatePrices(db as never, {
        productIds: ids(BULK_MAX_PRODUCTS + 1),
        mode: 'SET',
        value: 100,
        actorId: ACTOR_ID,
        reason: 'Seasonal repricing',
      }),
    ).rejects.toMatchObject({ code: 'TOO_MANY_PRODUCTS' });

    expect(db.queries).toHaveLength(0);
  });

  it('accepts exactly 200 ids (the cap is inclusive)', async () => {
    const db = createScriptedExecutor([[]]);

    const result = await bulkUpdatePrices(db as never, {
      productIds: ids(BULK_MAX_PRODUCTS),
      mode: 'SET',
      value: 100,
      actorId: ACTOR_ID,
      reason: 'Seasonal repricing',
      dryRun: true,
    });

    expect(result.requested).toBe(BULK_MAX_PRODUCTS);
    expect(result.changed).toBe(0);
    expect(db.queries).toHaveLength(1);
  });

  it('refuses an empty selection and a missing reason without touching the database', async () => {
    const db = createScriptedExecutor([]);

    await expect(
      bulkUpdatePrices(db as never, {
        productIds: [],
        mode: 'SET',
        value: 100,
        actorId: ACTOR_ID,
        reason: 'x',
      }),
    ).rejects.toMatchObject({ code: 'EMPTY_SELECTION' });

    await expect(
      bulkUpdatePrices(db as never, {
        productIds: [uuid(1)],
        mode: 'SET',
        value: 100,
        actorId: ACTOR_ID,
        reason: '   ',
      }),
    ).rejects.toMatchObject({ code: 'REASON_REQUIRED' });

    expect(db.queries).toHaveLength(0);
  });
});

describe('bulkUpdatePrices — dry run', () => {
  it('writes nothing: one SELECT, no UPDATE and no audit insert', async () => {
    const db = createScriptedExecutor([
      [targetRow(), targetRow({ id: uuid(2), price_amount: '500.00' })],
    ]);

    const result = await bulkUpdatePrices(db as never, {
      productIds: [uuid(1), uuid(2)],
      mode: 'SET',
      value: 1000,
      actorId: ACTOR_ID,
      reason: 'Price alignment',
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.operationId).toBeNull();
    expect(result.undoExpiresAt).toBeNull();
    expect(result.changed).toBe(2);
    expect(result.rows.map((row) => row.after?.priceAmount)).toEqual(['1000.00', '1000.00']);

    expect(db.queries).toHaveLength(1);
    const read = db.queries[0];
    expect(read?.text).toContain('FROM products p');
    expect(read?.text).not.toMatch(/\b(UPDATE|INSERT|DELETE)\b/);
  });

  it('returns a NOT_FOUND outcome for an id that is absent, keeping the caller order', async () => {
    const db = createScriptedExecutor([[targetRow()]]);

    const result = await bulkUpdatePrices(db as never, {
      productIds: [uuid(2), uuid(1)],
      mode: 'SET',
      value: 1000,
      actorId: ACTOR_ID,
      reason: 'Price alignment',
      dryRun: true,
    });

    expect(result.rows[0]).toMatchObject({ productId: uuid(2), outcome: 'SKIPPED', reason: 'NOT_FOUND' });
    expect(result.rows[1]).toMatchObject({ productId: uuid(1), outcome: 'CHANGED' });
  });
});

describe('bulkUpdatePrices — evidence is never fabricated', () => {
  it('never SETs an UNKNOWN-evidence price', async () => {
    const db = createScriptedExecutor([[targetRow({ price_evidence: 'UNKNOWN' })]]);

    const result = await bulkUpdatePrices(db as never, {
      productIds: [uuid(1)],
      mode: 'SET',
      value: 1000,
      actorId: ACTOR_ID,
      reason: 'Price alignment',
    });

    expect(result.rows[0]).toMatchObject({
      outcome: 'SKIPPED',
      reason: 'PRICE_EVIDENCE_UNKNOWN',
      after: null,
    });
    expect(result.changed).toBe(0);
    // The read is the only statement: nothing was written.
    expect(db.queries).toHaveLength(1);
  });

  it('never writes price_evidence on a legitimate apply', async () => {
    const db = createScriptedExecutor([
      [targetRow()],
      [writtenOperation([{ product_id: uuid(1), slug: 'slug', price_amount: '1000.00', state: 'DRAFT', published_at: null }])],
    ]);

    const result = await bulkUpdatePrices(db as never, {
      productIds: [uuid(1)],
      mode: 'SET',
      value: 1000,
      actorId: ACTOR_ID,
      reason: 'Price alignment',
      requestId: 'req_test',
    });

    expect(result.changed).toBe(1);
    expect(result.operationId).toBe(OPERATION_ID);

    const write = db.queries[1];
    expect(write?.text).toContain('UPDATE products p');
    expect(write?.text).toContain('INSERT INTO audit_logs');
    expect(write?.text).toContain("'bulk_operation'");
    expect(write?.text).toContain("'products'");
    expect(write?.values).toContain('BULK_PRICE_UPDATE');
    // Evidence is read for the report, never assigned.
    expect(write?.text).not.toMatch(/price_evidence\s*=/);
    expect(write?.text).not.toMatch(/\bDELETE\b/);
    // The new price is a bound parameter, never spliced into the statement.
    expect(write?.text).not.toContain('1000.00');
  });

  it('skips a row whose price would not change', async () => {
    const db = createScriptedExecutor([[targetRow({ price_amount: '1250.00' })]]);

    const result = await bulkUpdatePrices(db as never, {
      productIds: [uuid(1)],
      mode: 'SET',
      value: 1250,
      actorId: ACTOR_ID,
      reason: 'Price alignment',
      dryRun: true,
    });

    expect(result.rows[0]).toMatchObject({ outcome: 'SKIPPED', reason: 'NO_CHANGE' });
  });
});

describe('bulkSetState — publication gates', () => {
  it('refuses to publish an UNKNOWN-evidence row (gate V15)', async () => {
    const db = createScriptedExecutor([[targetRow({ price_evidence: 'UNKNOWN' })]]);

    const result = await bulkSetState(db as never, {
      productIds: [uuid(1)],
      to: 'ACTIVE',
      actorId: ACTOR_ID,
      reason: 'Launch',
    });

    expect(result.rows[0]).toMatchObject({ outcome: 'SKIPPED', reason: 'GATE_V15' });
    expect(db.queries).toHaveLength(1);
  });

  it('refuses to resurrect an ARCHIVED row', () => {
    const plan = planStateSet(
      [targetRow({ state: 'ARCHIVED' }) as unknown as BulkTargetProduct],
      'ACTIVE',
    );
    expect(plan.rows[0]).toMatchObject({ outcome: 'SKIPPED', reason: 'INVALID_STATE' });
    expect(plan.changes).toHaveLength(0);
  });

  it('publishes a verified row and lets the database clock own published_at', async () => {
    const db = createScriptedExecutor([
      [targetRow({ state: 'DRAFT', price_evidence: 'OBSERVED' })],
      [writtenOperation([{ product_id: uuid(1), slug: 'slug', price_amount: '1250.00', state: 'ACTIVE', published_at: '2026-11-23T10:00:00.000Z' }])],
    ]);

    const result = await bulkSetState(db as never, {
      productIds: [uuid(1)],
      to: 'ACTIVE',
      actorId: ACTOR_ID,
      reason: 'Launch',
    });

    expect(result.rows[0]).toMatchObject({ outcome: 'CHANGED', publishesNow: true });
    expect(result.rows[0]?.after?.state).toBe('ACTIVE');
    expect(result.changed).toBe(1);

    const write = db.queries[1];
    expect(write?.text).toContain('publish_now');
    expect(write?.text).toContain('now()');
    expect(write?.values).toContain('BULK_STATE_SET');
  });
});

describe('undoBulkOperation', () => {
  it('refuses outside the 30-minute window without writing', async () => {
    const db = createScriptedExecutor([[operationRow({ within_window: false })]]);

    await expect(
      undoBulkOperation(db as never, { operationId: OPERATION_ID, actorId: ACTOR_ID }),
    ).rejects.toMatchObject({ code: 'UNDO_WINDOW_EXPIRED' });

    expect(db.queries).toHaveLength(1);
    expect(db.queries[0]?.text).toContain('interval');
    expect(db.queries[0]?.values).toContain(OPERATION_ID);
    expect(db.queries[0]?.text).not.toMatch(/\b(UPDATE|INSERT)\b/);
  });

  it('is single-use: a second undo is refused before any write', async () => {
    const db = createScriptedExecutor([[operationRow({ already_undone: true })]]);

    await expect(
      undoBulkOperation(db as never, { operationId: OPERATION_ID, actorId: ACTOR_ID }),
    ).rejects.toMatchObject({ code: 'ALREADY_UNDONE' });

    expect(db.queries).toHaveLength(1);
  });

  it('refuses when a row changed since: the statement gate returns nothing', async () => {
    const db = createScriptedExecutor([[operationRow()], []]);

    await expect(
      undoBulkOperation(db as never, { operationId: OPERATION_ID, actorId: ACTOR_ID }),
    ).rejects.toMatchObject({ code: 'ROW_CHANGED_SINCE' });

    const write = db.queries[1];
    // The gate compares the current price and state with the recorded after
    // state, and the undo marker is only written when the gate passes.
    expect(write?.text).toContain('p.price_amount::text = t.after_price');
    expect(write?.text).toContain('p.state::text = t.after_state');
    expect(write?.text).toContain('prior_undos = 0');
    expect(write?.text).toContain('FROM ready');
  });

  it('reverses exactly the recorded rows and writes an append-only marker', async () => {
    const db = createScriptedExecutor([
      [operationRow()],
      [{ product_id: uuid(1), slug: 'oval-blue-sapphire-ring-js1409-w18-k1161', price_amount: '1250.00', state: 'DRAFT' }],
    ]);

    const result = await undoBulkOperation(db as never, {
      operationId: OPERATION_ID,
      actorId: ACTOR_ID,
      reason: 'Applied to the wrong selection',
      requestId: 'req_test',
    });

    expect(result.reversed).toBe(1);
    expect(result.rows[0]).toMatchObject({ productId: uuid(1), priceAmount: '1250.00', state: 'DRAFT' });

    const write = db.queries[1];
    expect(write?.text).toContain("'UNDO_BULK_OPERATION'");
    expect(write?.text).toContain("'UNDO_BULK_OPERATION_ROW'");
    expect(write?.text).toContain("'bulk_operation'");
    expect(write?.text).not.toMatch(/\bDELETE\b/);
    expect(write?.values).toContain(OPERATION_ID);
    expect(write?.values).toContain(ACTOR_ID);
    // The restore is exact: price, state and published_at come from the
    // recorded before-snapshot.
    expect(write?.text).toContain('price_amount = t.before_price::numeric(12, 2)');
    expect(write?.text).toContain('state = t.before_state::product_state');
    expect(write?.text).toContain('published_at = t.before_published_at::timestamptz');
  });

  it('refuses an unknown operation id', async () => {
    const db = createScriptedExecutor([[]]);

    await expect(
      undoBulkOperation(db as never, { operationId: OPERATION_ID, actorId: ACTOR_ID }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('refuses an operation that changed nothing', async () => {
    const db = createScriptedExecutor([[operationRow({ after_state: { rows: [] } })]]);

    await expect(
      undoBulkOperation(db as never, { operationId: OPERATION_ID, actorId: ACTOR_ID }),
    ).rejects.toMatchObject({ code: 'NOTHING_TO_UNDO' });
  });

  it('pins the undo window constant the SQL is built from', () => {
    expect(BULK_UNDO_WINDOW_MINUTES).toBe(30);
  });
});

describe('listRecentBulkOperations', () => {
  it('reads the undo list from the audit ledger and computes both flags', async () => {
    const db = createScriptedExecutor([
      [
        {
          operation_id: OPERATION_ID,
          action: 'BULK_PRICE_UPDATE',
          created_at: '2026-11-23T10:00:00.000Z',
          changed_rows: '2',
          undo_expires_at: '2026-11-23T10:30:00.000Z',
          within_window: true,
          already_undone: false,
        },
      ],
    ]);

    const rows = await listRecentBulkOperations(db as never, { limit: 5 });

    expect(rows[0]).toMatchObject({
      operation_id: OPERATION_ID,
      changed_rows: 2,
      within_window: true,
      already_undone: false,
    });

    const select = db.queries[0];
    expect(select?.text).toContain("o.entity_type = 'bulk_operation'");
    expect(select?.text).toContain("'UNDO_BULK_OPERATION'");
    expect(select?.text).toContain('ORDER BY o.id DESC');
    expect(select?.text).not.toMatch(/\b(UPDATE|INSERT|DELETE)\b/);
    expect(select?.values).toEqual([5]);
  });

  it('caps the list at 50', async () => {
    const db = createScriptedExecutor([[]]);
    await listRecentBulkOperations(db as never, { limit: 5000 });
    expect(db.queries[0]?.values).toEqual([50]);
  });
});
