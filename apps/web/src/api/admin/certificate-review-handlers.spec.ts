/**
 * apps/web/src/api/admin/certificate-review-handlers.spec.ts
 *
 * The certificate review HTTP contract, without a database:
 *   - the three routes exist in the router;
 *   - a role without the `certificates` module is refused with 403 BEFORE the
 *     repository (no database call at all);
 *   - the queue returns the honest total;
 *   - the detail returns per-field confidence;
 *   - approval below 0.90 is refused with the DOMAIN reason in the message;
 *   - a rejection without a reason is refused;
 *   - an approval returns VERIFIED.
 *
 * The executor is a canned queue: the repository suite proves the SQL shape
 * and the ledger writes; this suite proves the HTTP contract and the gate.
 */
import { describe, expect, it } from 'vitest';
import type { CatalogQueryService } from '../../modules/catalog/index.js';
import { lookupRoute } from '../routes.js';
import type { RouteContext } from '../handlers.js';
import {
  adminDecideCertificateHandler,
  adminGetCertificateForReviewHandler,
  adminListPendingCertificatesHandler,
} from './certificate-review-handlers.js';

const CERTIFICATE_ID = '66666666-6666-4666-8666-666666666666';
const ACTOR_ID = '44444444-4444-4444-8444-444444444444';
const IDS = { traceId: '00000000000000000000000000000g0v', requestId: 'req_test_cert' };

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
      method: options.method ?? 'GET',
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    }),
    ...(options.db === undefined ? {} : { db: options.db as never }),
  };
}

function certificateRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: CERTIFICATE_ID,
    kind: 'CERTIFICATE',
    gemstone_id: '77777777-7777-4777-8777-777777777777',
    configuration_id: null,
    product_id: null,
    subject_ref: 'K1161',
    lab_name: null,
    certificate_number: null,
    issue_date: null,
    report_type: null,
    verification_status: 'CROSS_CHECKED',
    confidence_overall: '0.960',
    source_url: null,
    created_at: '2026-11-23T09:00:00.000Z',
    updated_at: '2026-11-23T09:00:00.000Z',
    field_count: '6',
    min_confidence: '0.540',
    open_error_anomalies: '0',
    open_warn_anomalies: '1',
    ...overrides,
  };
}

function field(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    field_name: 'lab_name',
    raw_text: 'Sarine',
    normalized_value: 'Sarine',
    numeric_value: null,
    confidence: '0.950',
    bbox: [120, 80, 300, 40],
    verification_status: 'EXTRACTED',
    evidence_status: 'INFERRED',
    model_name: 'gemini-1.5-pro',
    extracted_at: '2026-11-23T09:10:00.000Z',
    ...overrides,
  };
}

function charterFields(): Record<string, unknown>[] {
  return [
    field({ field_name: 'lab_name', confidence: '0.940' }),
    field({ field_name: 'weight_ct', confidence: '0.970', normalized_value: '2.87', numeric_value: '2.8700' }),
    field({ field_name: 'origin', confidence: '0.540', normalized_value: 'Nigeria' }),
  ];
}

function highConfidenceFields(): Record<string, unknown>[] {
  return [
    field({ field_name: 'lab_name', confidence: '0.950' }),
    field({ field_name: 'weight_ct', confidence: '0.970', normalized_value: '2.87', numeric_value: '2.8700' }),
    field({ field_name: 'origin', confidence: '0.920', normalized_value: 'Nigeria' }),
  ];
}

function errorCode(body: unknown): string | undefined {
  return (body as { error?: { code?: string } } | null)?.error?.code;
}

function errorMessage(body: unknown): string | undefined {
  return (body as { error?: { message?: string } } | null)?.error?.message;
}

describe('certificate review route table', () => {
  it('registers the three endpoints', () => {
    const expected: Array<[string, string, string]> = [
      ['GET', '/api/v1/admin/certificates', 'adminListPendingCertificatesHandler'],
      ['GET', `/api/v1/admin/certificates/${CERTIFICATE_ID}`, 'adminGetCertificateForReviewHandler'],
      ['POST', `/api/v1/admin/certificates/${CERTIFICATE_ID}/decide`, 'adminDecideCertificateHandler'],
    ];
    for (const [method, path, id] of expected) {
      expect(lookupRoute(method, path)).toMatchObject({ kind: 'match', route: { id, method } });
    }
  });
});

describe('authorization before the repository', () => {
  it('refuses a role without the certificates module with 403 and no database call', async () => {
    const list = fakeDb([]);
    const listOutcome = await adminListPendingCertificatesHandler(
      context('/api/v1/admin/certificates', { role: 'CATALOG_MANAGER', db: list }),
      DEV_DEPS,
    );
    expect(listOutcome.status).toBe(403);
    expect(list.calls).toBe(0);

    const detail = fakeDb([]);
    const detailOutcome = await adminGetCertificateForReviewHandler(
      context(`/api/v1/admin/certificates/${CERTIFICATE_ID}`, {
        role: 'MIGRATION_ENGINEER',
        params: { certificateId: CERTIFICATE_ID },
        db: detail,
      }),
      DEV_DEPS,
    );
    expect(detailOutcome.status).toBe(403);
    expect(detail.calls).toBe(0);

    const decide = fakeDb([]);
    const decideOutcome = await adminDecideCertificateHandler(
      context(`/api/v1/admin/certificates/${CERTIFICATE_ID}/decide`, {
        role: 'CONTENT_PUBLISHER',
        method: 'POST',
        body: { decision: 'APPROVE' },
        params: { certificateId: CERTIFICATE_ID },
        db: decide,
      }),
      DEV_DEPS,
    );
    expect(decideOutcome.status).toBe(403);
    expect(decide.calls).toBe(0);
  });

  it('lets TRUST_REVIEWER read the queue (certificates/list)', async () => {
    const db = fakeDb([[certificateRow()], [{ count: '1' }]]);
    const outcome = await adminListPendingCertificatesHandler(
      context('/api/v1/admin/certificates', { role: 'TRUST_REVIEWER', db }),
      DEV_DEPS,
    );
    expect(outcome.status).toBe(200);
    const body = outcome.body as { data: unknown[]; meta: Record<string, number> };
    expect(body.meta).toMatchObject({ total: 1, limit: 50, offset: 0 });
    expect(body.data).toHaveLength(1);
  });
});

describe('GET /api/v1/admin/certificates', () => {
  it('returns the queue with counts as numbers', async () => {
    const db = fakeDb([[certificateRow()], [{ count: '17' }]]);

    const outcome = await adminListPendingCertificatesHandler(
      context('/api/v1/admin/certificates?limit=25&offset=50', { role: 'TRUST_REVIEWER', db }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(200);
    const body = outcome.body as { data: Array<Record<string, unknown>>; meta: Record<string, number> };
    expect(body.meta).toEqual({ total: 17, limit: 25, offset: 50 });
    expect(body.data[0]).toMatchObject({
      open_error_anomalies: 0,
      open_warn_anomalies: 1,
      field_count: 6,
      min_confidence: 0.54,
    });
  });
});

describe('GET /api/v1/admin/certificates/{certificateId}', () => {
  it('returns per-field confidence and the material assessment', async () => {
    const db = fakeDb([[certificateRow()], charterFields(), [], []]);

    const outcome = await adminGetCertificateForReviewHandler(
      context(`/api/v1/admin/certificates/${CERTIFICATE_ID}`, {
        role: 'TRUST_REVIEWER',
        params: { certificateId: CERTIFICATE_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(200);
    const data = (outcome.body as { data: Record<string, unknown> }).data;
    const fields = data['fields'] as Array<Record<string, unknown>>;
    expect(fields.find((entry) => entry['fieldName'] === 'origin')).toMatchObject({
      confidence: 0.54,
      band: 'LOW',
      isMaterial: true,
    });
    expect(data['verifiable']).toBe(false);
  });

  it('returns 404 for an unknown certificate', async () => {
    const db = fakeDb([[]]);

    const outcome = await adminGetCertificateForReviewHandler(
      context(`/api/v1/admin/certificates/${CERTIFICATE_ID}`, {
        role: 'TRUST_REVIEWER',
        params: { certificateId: CERTIFICATE_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(404);
    expect(errorCode(outcome.body)).toBe('NOT_FOUND');
  });
});

describe('POST /api/v1/admin/certificates/{certificateId}/decide', () => {
  it('refuses approval below 0.90 with the domain reason in the message', async () => {
    const db = fakeDb([[certificateRow()], charterFields(), []]);

    const outcome = await adminDecideCertificateHandler(
      context(`/api/v1/admin/certificates/${CERTIFICATE_ID}/decide`, {
        role: 'TRUST_REVIEWER',
        method: 'POST',
        body: { decision: 'APPROVE', note: 'Looks fine' },
        params: { certificateId: CERTIFICATE_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(422);
    expect(errorCode(outcome.body)).toBe('UNPROCESSABLE');
    expect(errorMessage(outcome.body)).toContain('every material field >= 0.90');
    // The certificate read, the field read and the anomaly read: no write.
    expect(db.calls).toBe(3);
  });

  it('refuses a rejection without a reason before reading anything', async () => {
    const db = fakeDb([]);

    const outcome = await adminDecideCertificateHandler(
      context(`/api/v1/admin/certificates/${CERTIFICATE_ID}/decide`, {
        role: 'TRUST_REVIEWER',
        method: 'POST',
        body: { decision: 'REJECT' },
        params: { certificateId: CERTIFICATE_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(400);
    expect(errorCode(outcome.body)).toBe('VALIDATION_FAILED');
    expect(db.calls).toBe(0);
  });

  it('approves a fully confident document and returns VERIFIED', async () => {
    const db = fakeDb([
      [certificateRow()],
      highConfidenceFields(),
      [],
      [{ id: CERTIFICATE_ID, review_id: 'r1', event_id: '42' }],
    ]);

    const outcome = await adminDecideCertificateHandler(
      context(`/api/v1/admin/certificates/${CERTIFICATE_ID}/decide`, {
        role: 'TRUST_REVIEWER',
        method: 'POST',
        body: { decision: 'APPROVE', note: 'Weights reconcile with the slug' },
        params: { certificateId: CERTIFICATE_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(200);
    const data = (outcome.body as { data: Record<string, unknown> }).data;
    expect(data).toMatchObject({
      decision: 'APPROVE',
      fromStatus: 'CROSS_CHECKED',
      toStatus: 'VERIFIED',
      reviewId: 'r1',
      eventId: '42',
    });
    expect(db.calls).toBe(4);
  });

  it('maps an unresolved ERROR anomaly to a 422 with the doc 17 code', async () => {
    const db = fakeDb([
      [certificateRow({ open_error_anomalies: '1' })],
      highConfidenceFields(),
      [{ id: 'a1', anomaly_type: 'WEIGHT_MISMATCH_SLUG', severity: 'ERROR', detail: {}, created_at: 'x' }],
    ]);

    const outcome = await adminDecideCertificateHandler(
      context(`/api/v1/admin/certificates/${CERTIFICATE_ID}/decide`, {
        role: 'TRUST_REVIEWER',
        method: 'POST',
        body: { decision: 'APPROVE' },
        params: { certificateId: CERTIFICATE_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(422);
    expect(errorCode(outcome.body)).toBe('CERTIFICATE_ANOMALY');
  });

  it('maps an already verified document to a 409 carrying the domain code', async () => {
    const db = fakeDb([[certificateRow({ verification_status: 'VERIFIED' })], highConfidenceFields(), []]);

    const outcome = await adminDecideCertificateHandler(
      context(`/api/v1/admin/certificates/${CERTIFICATE_ID}/decide`, {
        role: 'TRUST_REVIEWER',
        method: 'POST',
        body: { decision: 'APPROVE' },
        params: { certificateId: CERTIFICATE_ID },
        db,
      }),
      DEV_DEPS,
    );

    expect(outcome.status).toBe(409);
    expect(errorCode(outcome.body)).toBe('CERTIFICATE_ALREADY_VERIFIED');
  });
});
