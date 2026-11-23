/**
 * apps/web/src/api/admin/catalogue-bulk-handlers.spec.ts
 *
 * The catalogue bulk-edit HTTP contract, without a database:
 *   - the three routes exist in the router;
 *   - a role without the `products` module is refused with 403 BEFORE the
 *     repository (no database call at all);
 *   - more than 200 ids is refused with 400 and no read;
 *   - a dry run returns the per-row outcome and performs no write;
 *   - an UNKNOWN-evidence price is reported SKIPPED, never SET;
 *   - undo outside the window, a second undo and an intervening edit are 409s.
 *
 * The executor is a canned queue: the repository suite proves the SQL shape;
 * this suite proves the HTTP contract and the gate.
 */
import { describe, expect, it } from 'vitest';
import type { CatalogQueryService } from '../../modules/catalog/index.js';
import { lookupRoute } from '../routes.js';
import type { RouteContext } from '../handlers.js';
import {
  adminBulkPricesHandler,
  adminBulkStateHandler,
  adminUndoBulkOperationHandler,
} from './catalogue-bulk-handlers.js';

const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_ID = '33333333-3333-4333-8333-333333333334';
const ACTOR_ID = '44444444-4444-4444-8444-444444444444';
const OPERATION_ID = '55555555-5555-4555-8555-555555555555';
const IDS = { traceId: '00000000000000000000000000000g0v', requestId: 'req_test_bulk' };

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
    ...(options.role === undefined
      ? {}
      : { 'x-admin-sub': ACTOR_ID, 'x-admin-role': options.role }),
    ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
  };
  return {
    service: dummyService,
    params: options.params ?? {},
    url,
    ids: { ...IDS },
    request: new Request(url, {
      method: options.method ?? 'POST',
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    }),
    ...(options.db === undefined ? {} : { db: options.db as never }),
  };
}

function targetRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: PRODUCT_ID,
    slug: 'oval-blue-sapphire-ring-js1409-w18-k1161',
    title: 'Oval Blue Sapphire Ring',
    state: 'DRAFT',
    price_amount: '1250.00',
    price_evidence: 'OBSERVED',
    published_at: null,
    ...overrides,
  };
}

function writtenOperation(): Record<string, unknown> {
  return {
    operation_id: OPERATION_ID,
    created_at: '2026-11-23T10:00:00.000Z',
    undo_expires_at: '2026-11-23T10:30:00.000Z',
    changed: [
      {
        product_id: PRODUCT_ID,
        slug: 'oval-blue-sapphire-ring-js1409-w18-k1161',
        price_amount: '1000.00',
        state: 'DRAFT',
        published_at: null,
      },
    ],
  };
}

function operationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    operation_id: OPERATION_ID,
    action: 'BULK_PRICE_UPDATE',
    after_state: {
      rows: [
        {
          product_id: PRODUCT_ID,
          before: { price_amount: '1250.00', state: 'DRAFT', published_at: null },
          after: { price_amount: '1000.00', state: 'DRAFT', published_at: null },
        },
      ],
    },
    created_at: '2026-11-23T10:00:00.000Z',
    within_window: true,
    already_undone: false,
    ...overrides,
  };
}

function errorCode(body: unknown): string | undefined {
  return (body as { error?: { code?: string } } | null)?.error?.code;
}

function errorMessage(body: unknown): string | undefined {
  return (body as { error?: { message?: string } } | null)?.error?.message;
}

describe('catalogue bulk route table', () => {
  it('registers the three endpoints', () => {
    const expected: Array<[string, string, string]> = [
      ['POST', '/api/v1/admin/catalogue/bulk/prices', 'adminBulkPricesHandler'],
      ['POST', '/api/v1/admin/catalogue/bulk/state', 'adminBulkStateHandler'],
      ['POST', `/api/v1/admin/catalogue/bulk/${OPERATION_ID}/undo`, 'adminUndoBulkOperationHandler'],
    ];
    for (const [method, path, id] of expected) {
      expect(lookupRoute(method, path)).toMatchObject({ kind: 'match', route: { id, method } });
    }
  });
});

describe('authorization before the repository', () => {
  it('refuses a role without the products module on every bulk endpoint with 403', async () => {
    const prices = await adminBulkPricesHandler(
      context('/api/v1/admin/catalogue/bulk/prices', {
        role: 'CONTENT_EDITOR',
        body: { productIds: [PRODUCT_ID], mode: 'SET', value: 100, reason: 'x' },
        db: fakeDb([]),
      }),
      DEV_DEPS,
    );
    expect(prices.status).toBe(403);

    const state = await adminBulkStateHandler(
      context('/api/v1/admin/catalogue/bulk/state', {
        role: 'CONTENT_EDITOR',
        body: { productIds: [PRODUCT_ID], to: 'ACTIVE', reason: 'x' },
        db: fakeDb([]),
      }),
      DEV_DEPS,
    );
    expect(state.status).toBe(403);

    const undo = await adminUndoBulkOperationHandler(
      context(`/api/v1/admin/catalogue/bulk/${OPERATION_ID}/undo`, {
        role: 'TRUST_REVIEWER',
        body: {},
        params: { operationId: OPERATION_ID },
        db: fakeDb([]),
      }),
      DEV_DEPS,
    );
    expect(undo.status).toBe(403);
  });

  it('does not touch the database on a denied request', async () => {
    const db = fakeDb([]);
    const outcome = await adminBulkPricesHandler(
      context('/api/v1/admin/catalogue/bulk/prices', {
        role: 'READ_ONLY_ANALYST',
        body: { productIds: [PRODUCT_ID], mode: 'SET', value: 100, reason: 'x' },
        db,
      }),
      DEV_DEPS,
    );
    expect(outcome.status).toBe(403);
    expect(db.calls).toBe(0);
  });

  it('lets CATALOG_MANAGER preview and apply (products/bulk)', async () => {
    const db = fakeDb([[targetRow()]]);
    const outcome = await adminBulkPricesHandler(
      context('/api/v1/admin/catalogue/bulk/prices', {
        role: 'CATALOG_MANAGER',
        body: { productIds: [PRODUCT_ID], mode: 'SET', value: 1000, reason: 'Price alignment', dryRun: true },
        db,
      }),
      DEV_DEPS,
    );
    expect(outcome.status).toBe(200);
    expect(db.calls).toBe(1);
  });
});

describe('POST /api/v1/admin/catalogue/bulk/prices', () => {
  it('refuses more than 200 ids with 400 and no read', async () => {
    const db = fakeDb([]);
    const productIds = Array.from({ length: 201 }, (_, index) =>
      `33333333-3333-4333-8333-${String(index + 1).padStart(12, '0')}`,
    );

    const outcome = await adminBulkPricesHandler(
      context('/api/v1/admin/catalogue/bulk/prices', {
        role: 'CATALOG_MANAGER',
        body: { productIds, mode: 'SET', value: 100, reason: 'Too many' },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(400);
    expect(errorCode(outcome.body)).toBe('VALIDATION_FAILED');
    expect(errorMessage(outcome.body)).toContain('capped at 200');
    expect(db.calls).toBe(0);
  });

  it('returns the per-row preview and writes nothing on a dry run', async () => {
    const db = fakeDb([[targetRow()]]);

    const outcome = await adminBulkPricesHandler(
      context('/api/v1/admin/catalogue/bulk/prices', {
        role: 'CATALOG_MANAGER',
        body: { productIds: [PRODUCT_ID], mode: 'ADJUST_PERCENT', value: -10, reason: 'Autumn adjustment', dryRun: true },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(200);
    const data = (outcome.body as { data: Record<string, unknown> }).data;
    expect(data['dryRun']).toBe(true);
    expect(data['operationId']).toBeNull();
    expect(data['changed']).toBe(1);
    expect((data['rows'] as Array<Record<string, unknown>>)[0]).toMatchObject({
      outcome: 'CHANGED',
      after: { priceAmount: '1125.00' },
    });
    // One SELECT, no write statement.
    expect(db.calls).toBe(1);
  });

  it('never SETs an UNKNOWN-evidence price and reports why', async () => {
    const db = fakeDb([[targetRow({ price_evidence: 'UNKNOWN' })]]);

    const outcome = await adminBulkPricesHandler(
      context('/api/v1/admin/catalogue/bulk/prices', {
        role: 'CATALOG_MANAGER',
        body: { productIds: [PRODUCT_ID], mode: 'SET', value: 1000, reason: 'Price alignment' },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(200);
    const data = (outcome.body as { data: Record<string, unknown> }).data;
    expect(data['changed']).toBe(0);
    expect((data['rows'] as Array<Record<string, unknown>>)[0]).toMatchObject({
      outcome: 'SKIPPED',
      reason: 'PRICE_EVIDENCE_UNKNOWN',
    });
    expect(db.calls).toBe(1);
  });

  it('applies and returns the operation id and the undo expiry', async () => {
    const db = fakeDb([[targetRow()], [writtenOperation()]]);

    const outcome = await adminBulkPricesHandler(
      context('/api/v1/admin/catalogue/bulk/prices', {
        role: 'CATALOG_MANAGER',
        body: { productIds: [PRODUCT_ID, OTHER_ID], mode: 'SET', value: 1000, reason: 'Price alignment' },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(200);
    const data = (outcome.body as { data: Record<string, unknown> }).data;
    expect(data['operationId']).toBe(OPERATION_ID);
    expect(data['undoExpiresAt']).toBe('2026-11-23T10:30:00.000Z');
    expect(data['changed']).toBe(1);
    expect(data['skipped']).toBe(1);
    expect(db.calls).toBe(2);
  });

  it('refuses a malformed payload before the repository', async () => {
    const db = fakeDb([]);
    await expect(
      adminBulkPricesHandler(
        context('/api/v1/admin/catalogue/bulk/prices', {
          role: 'CATALOG_MANAGER',
          body: { productIds: ['not-a-uuid'], mode: 'SET', value: 100, reason: 'x' },
          db,
        }),
        DEV_DEPS,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(db.calls).toBe(0);
  });
});

describe('POST /api/v1/admin/catalogue/bulk/state', () => {
  it('reports a gate V15 skip instead of publishing', async () => {
    const db = fakeDb([[targetRow({ price_evidence: 'UNKNOWN' })]]);

    const outcome = await adminBulkStateHandler(
      context('/api/v1/admin/catalogue/bulk/state', {
        role: 'CATALOG_MANAGER',
        body: { productIds: [PRODUCT_ID], to: 'ACTIVE', reason: 'Launch' },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(200);
    const data = (outcome.body as { data: Record<string, unknown> }).data;
    expect((data['rows'] as Array<Record<string, unknown>>)[0]).toMatchObject({
      outcome: 'SKIPPED',
      reason: 'GATE_V15',
    });
    expect(db.calls).toBe(1);
  });
});

describe('POST /api/v1/admin/catalogue/bulk/{operationId}/undo', () => {
  it('refuses outside the 30-minute window with 409 and no write', async () => {
    const db = fakeDb([[operationRow({ within_window: false })]]);

    const outcome = await adminUndoBulkOperationHandler(
      context(`/api/v1/admin/catalogue/bulk/${OPERATION_ID}/undo`, {
        role: 'ADMIN_SUPER',
        body: {},
        params: { operationId: OPERATION_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(409);
    expect(errorCode(outcome.body)).toBe('UNDO_WINDOW_EXPIRED');
    expect(db.calls).toBe(1);
  });

  it('refuses a second undo with 409', async () => {
    const db = fakeDb([[operationRow({ already_undone: true })]]);

    const outcome = await adminUndoBulkOperationHandler(
      context(`/api/v1/admin/catalogue/bulk/${OPERATION_ID}/undo`, {
        role: 'ADMIN_SUPER',
        body: {},
        params: { operationId: OPERATION_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(409);
    expect(errorCode(outcome.body)).toBe('ALREADY_UNDONE');
    expect(db.calls).toBe(1);
  });

  it('refuses when a row changed since with 409', async () => {
    const db = fakeDb([[operationRow()], []]);

    const outcome = await adminUndoBulkOperationHandler(
      context(`/api/v1/admin/catalogue/bulk/${OPERATION_ID}/undo`, {
        role: 'ADMIN_SUPER',
        body: {},
        params: { operationId: OPERATION_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(409);
    expect(errorCode(outcome.body)).toBe('ROW_CHANGED_SINCE');
    expect(db.calls).toBe(2);
  });

  it('reverses the operation inside the window', async () => {
    const db = fakeDb([
      [operationRow()],
      [{ product_id: PRODUCT_ID, slug: 'slug', price_amount: '1250.00', state: 'DRAFT' }],
    ]);

    const outcome = await adminUndoBulkOperationHandler(
      context(`/api/v1/admin/catalogue/bulk/${OPERATION_ID}/undo`, {
        role: 'ADMIN_SUPER',
        body: { reason: 'Wrong selection' },
        params: { operationId: OPERATION_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(200);
    const data = (outcome.body as { data: Record<string, unknown> }).data;
    expect(data['reversed']).toBe(1);
    expect(data['operationId']).toBe(OPERATION_ID);
  });
});
