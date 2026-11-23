/**
 * packages/db/src/admin/governance-repository.spec.ts
 *
 * No database. The suite pins the governance contract:
 *   - a conflict is resolved exactly once; the second attempt refuses before
 *     writing anything and the update itself carries `resolution IS NULL`;
 *   - approval records the INV-08 review decision and NEVER writes
 *     `source_sku` or `sku_evidence_status`;
 *   - rejection flags the row and never deletes, archives or mutates state;
 *   - both sides of a conflict are read, never chosen by the repository;
 *   - pagination totals are the unfiltered count, honest past the last page.
 *
 * The executor is scripted: each statement returns a canned result and every
 * statement is captured as `{ text, values }`, so the assertions can prove the
 * values are BOUND and the forbidden columns never appear in the SQL text.
 */
import { describe, expect, it } from 'vitest';

import { createScriptedExecutor } from '../test/sql-capture.js';
import {
  approveDerivedIdentity,
  GovernanceError,
  listConflicts,
  listDerivedIdentities,
  listImportBatches,
  rejectDerivedIdentity,
  resolveConflict,
} from './governance-repository.js';

const BATCH_ID = '11111111-1111-4111-8111-111111111111';
const CONFLICT_ID = '22222222-2222-4222-8222-222222222222';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';
const ACTOR_ID = '44444444-4444-4444-8444-444444444444';

function conflictRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: CONFLICT_ID,
    import_batch_id: BATCH_ID,
    batch_key: 'ng-2026-10-03-urls-v1',
    entity_kind: 'product',
    entity_ref: 'K1161',
    field_name: 'total_weight_ct',
    value_a: '1.200',
    source_url_a: 'https://naturalgemstones.com/stone-a',
    value_b: '1.250',
    source_url_b: 'https://naturalgemstones.com/stone-b',
    resolution: null,
    resolved_by: null,
    resolved_at: null,
    created_at: '2026-11-23T10:00:00.000Z',
    ...overrides,
  };
}

function derivedRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: PRODUCT_ID,
    slug: 'oval-blue-sapphire-ring-js1409-w18-k1161',
    title: 'Oval Blue Sapphire Ring',
    source_url: 'https://naturalgemstones.com/oval-blue-sapphire-ring-js1409-w18-k1161',
    source_sku: null,
    source_sku_derived: 'JS1409-W18-K1161',
    sku_evidence_status: 'INFERRED',
    state: 'DRAFT',
    created_at: '2026-11-23T10:00:00.000Z',
    review_state: 'UNREVIEWED',
    review_note: null,
    reviewed_by: null,
    reviewed_at: null,
    ...overrides,
  };
}

describe('resolveConflict', () => {
  it('records the human decision and one audit row, with every value bound', async () => {
    const db = createScriptedExecutor([
      [conflictRow()],
      [conflictRow({ resolution: '1.200', resolved_by: ACTOR_ID, resolved_at: '2026-11-23T11:00:00.000Z' })],
    ]);

    const row = await resolveConflict(db as never, {
      conflictId: CONFLICT_ID,
      resolution: '1.200',
      actorId: ACTOR_ID,
      note: 'Side A matches the specification sheet',
      requestId: 'req_test',
    });

    expect(row.resolution).toBe('1.200');
    expect(row.batch_key).toBe('ng-2026-10-03-urls-v1');

    const write = db.queries[1];
    expect(write?.text).toContain('UPDATE staging_conflicts');
    expect(write?.text).toContain('AND resolution IS NULL');
    expect(write?.text).toContain('INSERT INTO audit_logs');
    expect(write?.text).toContain('RESOLVE_CONFLICT');
    expect(write?.values).toContain('1.200');
    expect(write?.values).toContain(ACTOR_ID);
    // The chosen value is a parameter, never spliced into the statement text.
    expect(write?.text).not.toContain('1.200');
  });

  it('is single-use: a second resolution refuses before any write', async () => {
    const db = createScriptedExecutor([[conflictRow({ resolution: '1.200' })]]);

    await expect(
      resolveConflict(db as never, {
        conflictId: CONFLICT_ID,
        resolution: '1.250',
        actorId: ACTOR_ID,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT_ALREADY_RESOLVED' });

    // Only the pre-read ran: no UPDATE, no audit insert.
    expect(db.queries).toHaveLength(1);
    expect(db.queries[0]?.text).toContain('FROM staging_conflicts c');
    expect(db.queries[0]?.text).not.toContain('UPDATE');
  });

  it('loses a concurrent race without writing an audit row', async () => {
    const db = createScriptedExecutor([[conflictRow()], []]);

    await expect(
      resolveConflict(db as never, {
        conflictId: CONFLICT_ID,
        resolution: '1.200',
        actorId: ACTOR_ID,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT_ALREADY_RESOLVED' });

    expect(db.queries).toHaveLength(2);
    expect(db.queries[1]?.text).toContain('AND resolution IS NULL');
  });

  it('refuses an empty resolution without touching the database', async () => {
    const db = createScriptedExecutor([]);

    await expect(
      resolveConflict(db as never, { conflictId: CONFLICT_ID, resolution: '   ', actorId: ACTOR_ID }),
    ).rejects.toBeInstanceOf(GovernanceError);
    expect(db.queries).toHaveLength(0);
  });
});

describe('listConflicts', () => {
  it('returns both sides verbatim and never picks one', async () => {
    const db = createScriptedExecutor([[conflictRow()], [{ count: '328' }]]);

    const page = await listConflicts(db as never, { resolved: false, limit: 50, offset: 0 });

    expect(page.total).toBe(328);
    expect(page.items[0]).toMatchObject({
      value_a: '1.200',
      source_url_a: 'https://naturalgemstones.com/stone-a',
      value_b: '1.250',
      source_url_b: 'https://naturalgemstones.com/stone-b',
      resolution: null,
    });

    const select = db.queries[0];
    expect(select?.text).toContain('c.value_a');
    expect(select?.text).toContain('c.value_b');
    expect(select?.text).toContain('c.source_url_a');
    expect(select?.text).toContain('c.source_url_b');
    expect(select?.text).toContain('c.resolution IS NULL');
    expect(select?.text).not.toMatch(/\b(UPDATE|INSERT|DELETE)\b/);
  });

  it('filters by batch id with a bound parameter', async () => {
    const db = createScriptedExecutor([[], [{ count: '0' }]]);

    await listConflicts(db as never, { batchId: BATCH_ID, limit: 10, offset: 0 });

    expect(db.queries[0]?.text).toContain('c.import_batch_id = $1::uuid');
    expect(db.queries[0]?.values[0]).toBe(BATCH_ID);
  });
});

describe('listImportBatches', () => {
  it('reports staged and conflicted row counts as numbers', async () => {
    const db = createScriptedExecutor([
      [
        {
          id: BATCH_ID,
          batch_key: 'ng-2026-10-03-urls-v1',
          source_system: 'naturalgemstones.com',
          source_artifact: 'urls.jsonl',
          source_sha256: 'a'.repeat(64),
          status: 'SUCCEEDED',
          started_at: '2026-11-23T09:00:00.000Z',
          finished_at: '2026-11-23T09:10:00.000Z',
          records_seen: '44218',
          records_accepted: '44218',
          records_rejected: '0',
          records_quarantined: '0',
          notes: null,
          created_at: '2026-11-23T09:00:00.000Z',
          staged_rows: '44218',
          conflict_rows: '328',
          open_conflict_rows: '328',
        },
      ],
      [{ count: '7' }],
    ]);

    const page = await listImportBatches(db as never, { limit: 50, offset: 0 });

    expect(page.total).toBe(7);
    expect(page.items[0]).toMatchObject({
      records_seen: 44218,
      staged_rows: 44218,
      conflict_rows: 328,
      open_conflict_rows: 328,
    });

    const select = db.queries[0];
    expect(select?.text).toContain('FROM staging_source_pages p');
    expect(select?.text).toContain('FROM staging_conflicts c');
    expect(select?.text).toContain('c.resolution IS NULL');
  });
});

describe('listDerivedIdentities', () => {
  it('selects only the derived class and keeps the total honest on the last page', async () => {
    const rows = Array.from({ length: 21 }, (_, index) =>
      derivedRow({ id: `33333333-3333-4333-8333-${String(index).padStart(12, '0')}` }),
    );
    const db = createScriptedExecutor([rows, [{ count: '221' }]]);

    const page = await listDerivedIdentities(db as never, { limit: 50, offset: 200 });

    expect(page.items).toHaveLength(21);
    expect(page.total).toBe(221);
    expect(page.limit).toBe(50);
    expect(page.offset).toBe(200);
    expect(page.items[0]?.source_sku).toBeNull();
    expect(page.items[0]?.sku_evidence_status).toBe('INFERRED');

    const select = db.queries[0];
    expect(select?.text).toContain('p.source_sku IS NULL');
    expect(select?.text).toContain('p.source_sku_derived IS NOT NULL');
    expect(select?.values).toEqual([50, 200]);
  });

  it('past the last page returns no rows but the true total', async () => {
    const db = createScriptedExecutor([[], [{ count: '221' }]]);

    const page = await listDerivedIdentities(db as never, { limit: 50, offset: 500 });

    expect(page.items).toHaveLength(0);
    expect(page.total).toBe(221);
    expect(db.queries[1]?.text).toContain('count(*)');
  });
});

describe('approveDerivedIdentity', () => {
  it('records APPROVED and never promotes INFERRED or writes source_sku', async () => {
    const db = createScriptedExecutor([
      [derivedRow()],
      [
        derivedRow({
          review_state: 'APPROVED',
          review_note: 'Two-source corroboration reviewed',
          reviewed_by: ACTOR_ID,
          reviewed_at: '2026-11-23T11:00:00.000Z',
        }),
      ],
    ]);

    const row = await approveDerivedIdentity(db as never, {
      productId: PRODUCT_ID,
      actorId: ACTOR_ID,
      note: 'Two-source corroboration reviewed',
      requestId: 'req_test',
    });

    expect(row.review_state).toBe('APPROVED');
    expect(row.sku_evidence_status).toBe('INFERRED');
    expect(row.source_sku).toBeNull();

    const write = db.queries[1];
    expect(write?.text).toContain('UPDATE products AS p');
    expect(write?.text).toContain('INSERT INTO audit_logs');
    expect(write?.values).toContain('APPROVE_DERIVED_IDENTITY');
    expect(write?.text).not.toContain('source_sku =');
    expect(write?.text).not.toContain('sku_evidence_status =');
    expect(write?.text).not.toContain('deleted_at =');
    expect(write?.text).toContain('p.source_sku IS NULL');
    expect(write?.values).toContain('APPROVED');
  });

  it('refuses a second decision without writing anything', async () => {
    const db = createScriptedExecutor([[derivedRow({ review_state: 'APPROVED' })]]);

    await expect(
      approveDerivedIdentity(db as never, { productId: PRODUCT_ID, actorId: ACTOR_ID }),
    ).rejects.toMatchObject({ code: 'ALREADY_DECIDED' });

    expect(db.queries).toHaveLength(1);
  });

  it('refuses a product that already has an observed SKU', async () => {
    const db = createScriptedExecutor([[derivedRow({ source_sku: 'JS1409-W18-K1161' })]]);

    await expect(
      approveDerivedIdentity(db as never, { productId: PRODUCT_ID, actorId: ACTOR_ID }),
    ).rejects.toMatchObject({ code: 'NOT_A_DERIVED_IDENTITY' });
  });
});

describe('rejectDerivedIdentity', () => {
  it('flags the review and never deletes or archives the row', async () => {
    const db = createScriptedExecutor([
      [derivedRow()],
      [derivedRow({ review_state: 'REJECTED', review_note: 'Attributes are UNKNOWN; re-fetch required' })],
    ]);

    const row = await rejectDerivedIdentity(db as never, {
      productId: PRODUCT_ID,
      actorId: ACTOR_ID,
      reason: 'Attributes are UNKNOWN; re-fetch required',
    });

    expect(row.review_state).toBe('REJECTED');
    expect(row.state).toBe('DRAFT');
    expect(row.source_sku_derived).toBe('JS1409-W18-K1161');

    const write = db.queries[1];
    expect(write?.text).not.toMatch(/\bDELETE\b/);
    expect(write?.text).not.toContain('deleted_at =');
    expect(write?.text).not.toContain('state =');
    expect(write?.values).toContain('REJECT_DERIVED_IDENTITY');
    expect(write?.text).toContain('INSERT INTO audit_logs');
    expect(write?.values).toContain('REJECTED');
  });

  it('requires a reason', async () => {
    const db = createScriptedExecutor([]);

    await expect(
      rejectDerivedIdentity(db as never, { productId: PRODUCT_ID, actorId: ACTOR_ID, reason: '  ' }),
    ).rejects.toMatchObject({ code: 'INVALID_DECISION' });
    expect(db.queries).toHaveLength(0);
  });
});
