/**
 * apps/web/src/api/admin/two-person-refusals.spec.ts
 *
 * The HTTP contract of the two-person rule at the two decision paths that do
 * not have their own handler suite:
 *
 *   - POST /api/v1/admin/products/{productId}/publish
 *   - POST /api/v1/admin/cms/revisions/{revisionId}/decide
 *   - POST /api/v1/admin/cms/pages/{pageId}/publish
 *
 * A self-approval is a 403 with the typed code `TWO_PERSON_REQUIRED`, never a
 * 409 and never a generic validation failure, and the refusal happens before
 * the write (the fake database is not asked to run one).
 */
import { describe, expect, it } from 'vitest';

import type { CatalogQueryService } from '../../modules/catalog/index.js';
import type { RouteContext } from '../handlers.js';
import { adminPublishProductHandler } from './catalog-handlers.js';
import { adminDecideRevisionHandler, adminPublishPageHandler } from './cms-handlers.js';

const ACTOR_ID = '44444444-4444-4444-8444-444444444444';
const PRODUCT_ID = '99999999-9999-4999-8999-999999999999';
const REVISION_ID = '12121212-1212-4212-8212-121212121212';
const PAGE_ID = '13131313-1313-4313-8313-131313131313';
const IDS = { traceId: '00000000000000000000000000000tp1', requestId: 'req_two_person' };

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
    readonly role: string;
    readonly method: string;
    readonly params: Record<string, string>;
    readonly body?: unknown;
    readonly db: FakeDb;
  },
): RouteContext {
  const url = new URL(`http://localhost${path}`);
  return {
    service: dummyService,
    params: options.params,
    url,
    ids: { ...IDS },
    request: new Request(url, {
      method: options.method,
      headers: {
        'x-admin-sub': ACTOR_ID,
        'x-admin-role': options.role,
        'content-type': 'application/json',
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    }),
    db: options.db as never,
  };
}

function errorCode(body: unknown): string | undefined {
  return (body as { error?: { code?: string } } | null)?.error?.code;
}

describe('POST /api/v1/admin/products/{productId}/publish — two-person', () => {
  function productRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: PRODUCT_ID,
      slug: 'ceylon-sapphire-ring',
      title: 'Ceylon Sapphire Ring',
      kind: 'CONFIGURED',
      state: 'DRAFT',
      price_amount: '2450.00',
      currency: 'USD',
      price_evidence: 'OBSERVED',
      published_at: null,
      ...overrides,
    };
  }

  it('refuses a self-approval with 403 TWO_PERSON_REQUIRED before any write', async () => {
    const db = fakeDb([[productRow()], [{ actor_id: ACTOR_ID }]]);

    const outcome = await adminPublishProductHandler(
      context(`/api/v1/admin/products/${PRODUCT_ID}/publish`, {
        role: 'ADMIN_SUPER',
        method: 'POST',
        params: { productId: PRODUCT_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(403);
    expect(errorCode(outcome.body)).toBe('TWO_PERSON_REQUIRED');
    expect(db.calls).toBe(2);
  });

  it('publishes when a different approver is recorded', async () => {
    const db = fakeDb([
      [productRow()],
      [{ actor_id: '55555555-5555-4555-8555-555555555555' }],
      [productRow({ state: 'ACTIVE' })],
      [],
    ]);

    const outcome = await adminPublishProductHandler(
      context(`/api/v1/admin/products/${PRODUCT_ID}/publish`, {
        role: 'ADMIN_SUPER',
        method: 'POST',
        params: { productId: PRODUCT_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(200);
    expect((outcome.body as { data: { state: string } }).data.state).toBe('ACTIVE');
  });
});

describe('CMS decision handlers — two-person', () => {
  function revisionRow(): Record<string, unknown> {
    return {
      id: REVISION_ID,
      page_id: PAGE_ID,
      version: 2,
      blocks: [],
      raw_markdown: null,
      editor_id: ACTOR_ID,
      note: null,
      review_state: 'IN_REVIEW',
      approved_by: null,
      decided_at: null,
    };
  }

  it('refuses a self-approval of a trust page with 403 TWO_PERSON_REQUIRED', async () => {
    const db = fakeDb([[revisionRow()], [{ page_kind: 'CERTIFICATE_GUIDE' }]]);

    const outcome = await adminDecideRevisionHandler(
      context(`/api/v1/admin/cms/revisions/${REVISION_ID}/decide`, {
        role: 'CONTENT_PUBLISHER',
        method: 'POST',
        params: { revisionId: REVISION_ID },
        body: { approve: true },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(403);
    expect(errorCode(outcome.body)).toBe('TWO_PERSON_REQUIRED');
    // The revision read and the page-kind read only; no decision UPDATE.
    expect(db.calls).toBe(2);
  });

  it('refuses to publish a trust page as its revision editor with 403 TWO_PERSON_REQUIRED', async () => {
    const db = fakeDb([
      [{ review_state: 'APPROVED', editor_id: ACTOR_ID, page_kind: 'BUYING_GUIDE', status: 'DRAFT' }],
    ]);

    const outcome = await adminPublishPageHandler(
      context(`/api/v1/admin/cms/pages/${PAGE_ID}/publish`, {
        role: 'CONTENT_PUBLISHER',
        method: 'POST',
        params: { pageId: PAGE_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(403);
    expect(errorCode(outcome.body)).toBe('TWO_PERSON_REQUIRED');
    expect(db.calls).toBe(1);
  });
});
