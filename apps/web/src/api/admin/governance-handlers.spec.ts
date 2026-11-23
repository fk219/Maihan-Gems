/**
 * apps/web/src/api/admin/governance-handlers.spec.ts
 *
 * The data-governance API contract, without a database:
 *   - the six routes exist in the router,
 *   - a role without the module is refused with 403 BEFORE the repository,
 *   - a second conflict resolution is a 409, not an overwrite,
 *   - approval returns an INFERRED row with source_sku NULL,
 *   - rejection returns a DRAFT row (the no-delete proof lives in the
 *     repository suite, where the SQL text is inspected),
 *   - the pagination total stays true past the last page.
 *
 * The executor is a canned queue: the repository suite proves the SQL shape;
 * this suite proves the HTTP contract and the gate.
 */
import { describe, expect, it } from 'vitest';
import type { CatalogQueryService } from '../../modules/catalog/index.js';
import { lookupRoute } from '../routes.js';
import type { RouteContext } from '../handlers.js';
import {
  adminApproveDerivedIdentityHandler,
  adminListConflictsHandler,
  adminListDerivedIdentitiesHandler,
  adminListImportBatchesHandler,
  adminRejectDerivedIdentityHandler,
  adminResolveConflictHandler,
} from './governance-handlers.js';

const BATCH_ID = '11111111-1111-4111-8111-111111111111';
const CONFLICT_ID = '22222222-2222-4222-8222-222222222222';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';
const ACTOR_ID = '44444444-4444-4444-8444-444444444444';
const IDS = { traceId: '00000000000000000000000000000g0v', requestId: 'req_test_governance' };

const dummyService = {} as CatalogQueryService;
const DEV_DEPS = { allowRoleHeader: true, environment: 'test' } as const;

interface FakeDb {
  calls: number;
  execute(): Promise<{ rows: unknown[] }>;
}

function fakeDb(results: readonly (readonly unknown[])[]): FakeDb {
  const queue = [...results];
  const db: FakeDb = {
    calls: 0,
    async execute() {
      db.calls += 1;
      const rows = queue.shift();
      if (rows === undefined) throw new Error('fake-db: no canned result');
      return { rows: [...rows] };
    },
  };
  return db;
}

function roleHeaders(role: string): Record<string, string> {
  return { 'x-admin-sub': ACTOR_ID, 'x-admin-role': role };
}

function context(
  path: string,
  options: {
    readonly method?: string;
    readonly role?: string;
    readonly body?: unknown;
    readonly params?: Record<string, string>;
    readonly db?: FakeDb;
  } = {},
): RouteContext {
  const url = new URL(`http://localhost${path}`);
  const headers: Record<string, string> = {
    ...(options.role === undefined ? {} : roleHeaders(options.role)),
    ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
  };
  return {
    service: dummyService,
    params: options.params ?? {},
    url,
    ids: { ...IDS },
    request: new Request(url, {
      method: options.method ?? 'GET',
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    }),
    ...(options.db === undefined ? {} : { db: options.db as never }),
  };
}

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

function errorCode(body: unknown): string | undefined {
  return (body as { error?: { code?: string } } | null)?.error?.code;
}

describe('governance route table', () => {
  it('registers all six endpoints', () => {
    const expected: Array<[string, string, string]> = [
      ['GET', '/api/v1/admin/import-batches', 'adminListImportBatchesHandler'],
      ['GET', '/api/v1/admin/conflicts', 'adminListConflictsHandler'],
      ['POST', `/api/v1/admin/conflicts/${CONFLICT_ID}/resolve`, 'adminResolveConflictHandler'],
      ['GET', '/api/v1/admin/derived-identities', 'adminListDerivedIdentitiesHandler'],
      ['POST', `/api/v1/admin/derived-identities/${PRODUCT_ID}/approve`, 'adminApproveDerivedIdentityHandler'],
      ['POST', `/api/v1/admin/derived-identities/${PRODUCT_ID}/reject`, 'adminRejectDerivedIdentityHandler'],
    ];
    for (const [method, path, id] of expected) {
      expect(lookupRoute(method, path)).toMatchObject({ kind: 'match', route: { id, method } });
    }
  });
});

describe('authorization before the repository', () => {
  it('refuses a role without import_batches with 403 and no database call', async () => {
    const db = fakeDb([]);
    const outcome = await adminListImportBatchesHandler(
      context('/api/v1/admin/import-batches', { role: 'CONTENT_EDITOR', db }),
      DEV_DEPS,
    );
    expect(outcome.status).toBe(403);
    expect(db.calls).toBe(0);
  });

  it('refuses a role without conflicts with 403', async () => {
    const db = fakeDb([]);
    const outcome = await adminListConflictsHandler(
      context('/api/v1/admin/conflicts', { role: 'CATALOG_MANAGER', db }),
      DEV_DEPS,
    );
    expect(outcome.status).toBe(403);
    expect(db.calls).toBe(0);
  });

  it('refuses a role without derived_approvals with 403', async () => {
    const db = fakeDb([]);
    const outcome = await adminListDerivedIdentitiesHandler(
      context('/api/v1/admin/derived-identities', { role: 'READ_ONLY_ANALYST', db }),
      DEV_DEPS,
    );
    expect(outcome.status).toBe(403);
    expect(db.calls).toBe(0);
  });

  it('refuses a resolve without the conflicts module with 403', async () => {
    const db = fakeDb([]);
    const outcome = await adminResolveConflictHandler(
      context(`/api/v1/admin/conflicts/${CONFLICT_ID}/resolve`, {
        method: 'POST',
        role: 'CONTENT_EDITOR',
        body: { resolution: '1.200' },
        params: { conflictId: CONFLICT_ID },
        db,
      }),
      DEV_DEPS,
    );
    expect(outcome.status).toBe(403);
    expect(db.calls).toBe(0);
  });
});

describe('GET /api/v1/admin/import-batches', () => {
  it('returns the batch counts and an honest total', async () => {
    const db = fakeDb([
      [
        {
          id: BATCH_ID,
          batch_key: 'ng-2026-10-03-urls-v1',
          source_system: 'naturalgemstones.com',
          source_artifact: 'urls.jsonl',
          source_sha256: null,
          status: 'SUCCEEDED',
          started_at: null,
          finished_at: null,
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
      [{ count: '1' }],
    ]);

    const outcome = await adminListImportBatchesHandler(
      context('/api/v1/admin/import-batches', { role: 'MIGRATION_ENGINEER', db }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(200);
    const body = outcome.body as {
      data: Array<Record<string, unknown>>;
      meta: { total: number; limit: number; offset: number };
    };
    expect(body.data[0]).toMatchObject({ staged_rows: 44218, open_conflict_rows: 328 });
    expect(body.meta).toEqual({ total: 1, limit: 50, offset: 0 });
  });
});

describe('POST /api/v1/admin/conflicts/{conflictId}/resolve', () => {
  it('resolves once and returns the decided row', async () => {
    const db = fakeDb([
      [conflictRow()],
      [conflictRow({ resolution: '1.200', resolved_by: ACTOR_ID, resolved_at: '2026-11-23T11:00:00.000Z' })],
    ]);

    const outcome = await adminResolveConflictHandler(
      context(`/api/v1/admin/conflicts/${CONFLICT_ID}/resolve`, {
        method: 'POST',
        role: 'MIGRATION_ENGINEER',
        body: { resolution: '1.200', note: 'Side A matches the spec sheet' },
        params: { conflictId: CONFLICT_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(200);
    expect((outcome.body as { data: Record<string, unknown> }).data['resolution']).toBe('1.200');
  });

  it('returns 409 on a second resolution and writes nothing', async () => {
    const db = fakeDb([[conflictRow({ resolution: '1.200' })]]);

    const outcome = await adminResolveConflictHandler(
      context(`/api/v1/admin/conflicts/${CONFLICT_ID}/resolve`, {
        method: 'POST',
        role: 'MIGRATION_ENGINEER',
        body: { resolution: '1.250' },
        params: { conflictId: CONFLICT_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(409);
    expect(errorCode(outcome.body)).toBe('CONFLICT_ALREADY_RESOLVED');
    expect(db.calls).toBe(1);
  });
});

describe('derived-identity decisions', () => {
  it('approve returns APPROVED with INFERRED evidence and no source_sku', async () => {
    const db = fakeDb([
      [derivedRow()],
      [derivedRow({ review_state: 'APPROVED', reviewed_by: ACTOR_ID })],
    ]);

    const outcome = await adminApproveDerivedIdentityHandler(
      context(`/api/v1/admin/derived-identities/${PRODUCT_ID}/approve`, {
        method: 'POST',
        role: 'MIGRATION_ENGINEER',
        body: { note: 'Two-source corroboration reviewed' },
        params: { productId: PRODUCT_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(200);
    const row = (outcome.body as { data: Record<string, unknown> }).data;
    expect(row['review_state']).toBe('APPROVED');
    expect(row['sku_evidence_status']).toBe('INFERRED');
    expect(row['source_sku']).toBeNull();
  });

  it('reject records REJECTED and leaves the row in DRAFT', async () => {
    const db = fakeDb([
      [derivedRow()],
      [derivedRow({ review_state: 'REJECTED', review_note: 'Attributes UNKNOWN' })],
    ]);

    const outcome = await adminRejectDerivedIdentityHandler(
      context(`/api/v1/admin/derived-identities/${PRODUCT_ID}/reject`, {
        method: 'POST',
        role: 'MIGRATION_ENGINEER',
        body: { reason: 'Attributes UNKNOWN' },
        params: { productId: PRODUCT_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(200);
    const row = (outcome.body as { data: Record<string, unknown> }).data;
    expect(row['review_state']).toBe('REJECTED');
    expect(row['state']).toBe('DRAFT');
  });

  it('refuses a product that is not a derived identity with 422', async () => {
    const db = fakeDb([[derivedRow({ source_sku: 'JS1409-W18-K1161' })]]);

    const outcome = await adminApproveDerivedIdentityHandler(
      context(`/api/v1/admin/derived-identities/${PRODUCT_ID}/approve`, {
        method: 'POST',
        role: 'MIGRATION_ENGINEER',
        body: {},
        params: { productId: PRODUCT_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(422);
    expect(errorCode(outcome.body)).toBe('UNPROCESSABLE');
  });
});

describe('GET /api/v1/admin/derived-identities', () => {
  it('keeps the total honest past the last page', async () => {
    const db = fakeDb([[], [{ count: '221' }]]);

    const outcome = await adminListDerivedIdentitiesHandler(
      context('/api/v1/admin/derived-identities?limit=50&offset=500', {
        role: 'MIGRATION_ENGINEER',
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(200);
    const body = outcome.body as { data: unknown[]; meta: Record<string, number> };
    expect(body.data).toHaveLength(0);
    expect(body.meta).toMatchObject({ total: 221, limit: 50, offset: 500 });
  });
});
