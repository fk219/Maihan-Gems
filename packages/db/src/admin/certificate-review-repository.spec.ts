/**
 * packages/db/src/admin/certificate-review-repository.spec.ts
 *
 * No database. The suite pins the certificate review contract (Track C7):
 *   - the queue puts ERROR anomalies first and the least confident document
 *     second, and the total stays honest;
 *   - the detail carries per-field confidence, bbox and the confidence band,
 *     and the material-field assessment comes from the DOMAIN;
 *   - approval below the 0.90 whole-document threshold is refused with the
 *     DOMAIN reason and writes nothing;
 *   - an unresolved ERROR anomaly blocks verification;
 *   - an approved decision writes the review, the append-only ledger row and
 *     the audit row in ONE statement, and never UPDATEs the ledger;
 *   - a lost race is refused as ALREADY_DECIDED.
 *
 * The executor is scripted: each statement returns a canned result and every
 * statement is captured as `{ text, values }`.
 */
import { describe, expect, it } from 'vitest';

import { createScriptedExecutor } from '../test/sql-capture.js';
import {
  decideCertificate,
  extractionSchemaFromFields,
  getCertificateForReview,
  listPendingCertificates,
  type CertificateExtractionRow,
} from './certificate-review-repository.js';

const CERTIFICATE_ID = '66666666-6666-4666-8666-666666666666';
const ACTOR_ID = '44444444-4444-4444-8444-444444444444';

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
    source_url: 'https://naturalgemstones.com/stone/K1161/cert/K1161_nsc_web.jpg',
    created_at: '2026-11-23T09:00:00.000Z',
    updated_at: '2026-11-23T09:00:00.000Z',
    field_count: '6',
    min_confidence: '0.920',
    open_error_anomalies: '0',
    open_warn_anomalies: '0',
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

/** The charter's worked example: origin at 0.54 is never verified truth. */
function charterFields(): Record<string, unknown>[] {
  return [
    field({ field_name: 'lab_name', confidence: '0.940', normalized_value: 'Sarine' }),
    field({ field_name: 'report_type', confidence: '0.910', normalized_value: 'SARIN' }),
    field({ field_name: 'certificate_number', confidence: '0.000', normalized_value: null }),
    field({ field_name: 'issue_date', confidence: '0.880', normalized_value: '2026-03-14' }),
    field({
      field_name: 'weight_ct',
      confidence: '0.970',
      normalized_value: '2.87',
      numeric_value: '2.8700',
    }),
    field({ field_name: 'origin', confidence: '0.540', normalized_value: 'Nigeria' }),
  ];
}

/** Every material field at or above 0.90. */
function highConfidenceFields(): Record<string, unknown>[] {
  return [
    field({ field_name: 'lab_name', confidence: '0.950', normalized_value: 'Sarine' }),
    field({
      field_name: 'weight_ct',
      confidence: '0.970',
      normalized_value: '2.87',
      numeric_value: '2.8700',
    }),
    field({ field_name: 'origin', confidence: '0.920', normalized_value: 'Nigeria' }),
    field({ field_name: 'treatment_0', confidence: '0.910', normalized_value: 'HEAT_TREATED' }),
  ];
}

describe('listPendingCertificates', () => {
  it('orders anomalies first, then the least confident, and reports the true total', async () => {
    const db = createScriptedExecutor([
      [certificateRow({ open_error_anomalies: '2', min_confidence: '0.540' })],
      [{ count: '17' }],
    ]);

    const page = await listPendingCertificates(db as never, { limit: 50, offset: 0 });

    expect(page.total).toBe(17);
    expect(page.items[0]).toMatchObject({
      open_error_anomalies: 2,
      open_warn_anomalies: 0,
      field_count: 6,
      min_confidence: 0.54,
      verification_status: 'CROSS_CHECKED',
    });

    const select = db.queries[0];
    expect(select?.text).toContain("c.verification_status::text IN ('UNVERIFIED', 'EXTRACTED', 'CROSS_CHECKED')");
    expect(select?.text).toContain('ORDER BY (open_error_anomalies > 0) DESC');
    expect(select?.text).toContain('min_confidence ASC NULLS FIRST');
    expect(select?.text).not.toMatch(/\b(UPDATE|INSERT|DELETE)\b/);
    expect(select?.values).toEqual([50, 0]);
  });

  it('caps the page size at 200', async () => {
    const db = createScriptedExecutor([[], [{ count: '0' }]]);

    const page = await listPendingCertificates(db as never, { limit: 5000, offset: -3 });

    expect(page.limit).toBe(200);
    expect(page.offset).toBe(0);
    expect(db.queries[0]?.values).toEqual([200, 0]);
  });
});

describe('extractionSchemaFromFields', () => {
  it('gives a missing field confidence 0.0, never an implicit pass', () => {
    const schema = extractionSchemaFromFields([]);
    expect(schema.lab_name).toEqual({ value: null, confidence: 0 });
    expect(schema.stone.weight_ct).toEqual({ value: null, confidence: 0 });
  });

  it('rebuilds numeric fields and treatments from the per-field rows', () => {
    const fields = highConfidenceFields().map((row) => ({
      field_name: String(row['field_name']),
      raw_text: (row['raw_text'] as string | null) ?? null,
      normalized_value: (row['normalized_value'] as string | null) ?? null,
      numeric_value: row['numeric_value'] === null ? null : Number(row['numeric_value']),
      confidence: Number(row['confidence']),
      bbox: row['bbox'],
      verification_status: String(row['verification_status']),
      evidence_status: String(row['evidence_status']),
      model_name: String(row['model_name']),
      extracted_at: String(row['extracted_at']),
    })) satisfies CertificateExtractionRow[];

    const schema = extractionSchemaFromFields(fields);
    expect(schema.stone.weight_ct).toEqual({ value: 2.87, confidence: 0.97 });
    expect(schema.treatments).toEqual([{ value: 'HEAT_TREATED', confidence: 0.91 }]);
  });
});

describe('getCertificateForReview', () => {
  it('returns confidence, band, bbox and the material assessment per field', async () => {
    const db = createScriptedExecutor([
      [certificateRow()],
      charterFields(),
      [],
      [],
    ]);

    const detail = await getCertificateForReview(db as never, CERTIFICATE_ID);

    expect(detail).not.toBeNull();
    const origin = detail?.fields.find((entry) => entry.fieldName === 'origin');
    expect(origin).toMatchObject({
      confidence: 0.54,
      band: 'LOW',
      publiclyDisplayable: true,
      isMaterial: true,
      bbox: [120, 80, 300, 40],
    });

    const certificateNumber = detail?.fields.find((entry) => entry.fieldName === 'certificate_number');
    expect(certificateNumber).toMatchObject({ confidence: 0, band: 'REJECTED', publiclyDisplayable: false });

    // The domain assessed the material fields; origin 0.54 is not high.
    expect(detail?.materialFields).toContainEqual(
      expect.objectContaining({ fieldName: 'origin', confidence: 0.54, isHighConfidence: false }),
    );
    expect(detail?.verifiable).toBe(false);
    expect(detail?.latestReview).toBeNull();
  });

  it('reads the latest extraction per field, never an arbitrary run', async () => {
    const db = createScriptedExecutor([[certificateRow()], [], [], []]);

    await getCertificateForReview(db as never, CERTIFICATE_ID);

    const fields = db.queries[1];
    expect(fields?.text).toContain('DISTINCT ON (x.field_name)');
    expect(fields?.text).toContain('ORDER BY x.field_name, x.extracted_at DESC');
  });

  it('returns null for an unknown certificate', async () => {
    const db = createScriptedExecutor([[]]);
    expect(await getCertificateForReview(db as never, CERTIFICATE_ID)).toBeNull();
    expect(db.queries).toHaveLength(1);
  });
});

describe('decideCertificate — approval threshold', () => {
  it('refuses approval below 0.90 with the DOMAIN reason and writes nothing', async () => {
    const db = createScriptedExecutor([
      [certificateRow()],
      charterFields(),
      [],
    ]);

    await expect(
      decideCertificate(db as never, {
        certificateId: CERTIFICATE_ID,
        decision: 'APPROVE',
        actorId: ACTOR_ID,
      }),
    ).rejects.toMatchObject({
      name: 'DomainError',
      code: 'INSUFFICIENT_CONFIDENCE_FOR_VERIFICATION',
      message: 'verification requires every material field >= 0.90',
    });

    // Read + fields + anomalies: the write statement never ran.
    expect(db.queries).toHaveLength(3);
    expect(db.queries[2]?.text).not.toMatch(/\bINSERT\b/);
  });

  it('refuses approval when an ERROR anomaly is unresolved', async () => {
    const db = createScriptedExecutor([
      [certificateRow({ open_error_anomalies: '1' })],
      highConfidenceFields(),
      [{ id: 'a1', anomaly_type: 'WEIGHT_MISMATCH_SLUG', severity: 'ERROR', detail: {}, created_at: 'x' }],
    ]);

    await expect(
      decideCertificate(db as never, {
        certificateId: CERTIFICATE_ID,
        decision: 'APPROVE',
        actorId: ACTOR_ID,
      }),
    ).rejects.toMatchObject({ code: 'UNRESOLVED_ERROR_ANOMALY' });

    expect(db.queries).toHaveLength(3);
  });

  it('approves a fully confident document and writes review + ledger + audit in one statement', async () => {
    const db = createScriptedExecutor([
      [certificateRow()],
      highConfidenceFields(),
      [],
      [{ id: CERTIFICATE_ID, review_id: 'r1', event_id: '42' }],
    ]);

    const result = await decideCertificate(db as never, {
      certificateId: CERTIFICATE_ID,
      decision: 'APPROVE',
      actorId: ACTOR_ID,
      note: 'All material fields above 0.90; weights reconcile with the slug',
      requestId: 'req_test',
    });

    expect(result).toMatchObject({
      decision: 'APPROVE',
      fromStatus: 'CROSS_CHECKED',
      toStatus: 'VERIFIED',
      reviewId: 'r1',
      eventId: '42',
    });
    expect(result.certificate.verification_status).toBe('VERIFIED');

    const write = db.queries[3];
    expect(write?.text).toContain('UPDATE certificates');
    expect(write?.text).toContain('INSERT INTO certificate_reviews');
    expect(write?.text).toContain('INSERT INTO verification_events');
    expect(write?.text).toContain('INSERT INTO audit_logs');
    // The audit action is a bound parameter, never spliced into the SQL text.
    expect(write?.values).toContain('APPROVE_CERTIFICATE');
    expect(write?.text).not.toContain('APPROVE_CERTIFICATE');
    // The status guard makes the decision single-use under concurrency.
    expect(write?.text).toContain('verification_status = $');
    // Append-only ledger: no UPDATE/DELETE of verification_events anywhere.
    expect(write?.text).not.toMatch(/UPDATE\s+verification_events/i);
    expect(write?.text).not.toMatch(/DELETE\s+FROM\s+verification_events/i);
    expect(write?.values).toContain('APPROVE');
    expect(write?.values).toContain(ACTOR_ID);
  });

  it('refuses an already verified document with the domain terminal-state code', async () => {
    const db = createScriptedExecutor([
      [certificateRow({ verification_status: 'VERIFIED' })],
      highConfidenceFields(),
      [],
    ]);

    await expect(
      decideCertificate(db as never, {
        certificateId: CERTIFICATE_ID,
        decision: 'APPROVE',
        actorId: ACTOR_ID,
      }),
    ).rejects.toMatchObject({ code: 'CERTIFICATE_ALREADY_VERIFIED' });
  });
});

describe('decideCertificate — rejection', () => {
  it('requires a reason and touches nothing without one', async () => {
    const db = createScriptedExecutor([]);

    await expect(
      decideCertificate(db as never, {
        certificateId: CERTIFICATE_ID,
        decision: 'REJECT',
        actorId: ACTOR_ID,
      }),
    ).rejects.toMatchObject({ code: 'NOTE_REQUIRED' });

    expect(db.queries).toHaveLength(0);
  });

  it('records REJECTED in the ledger and never deletes the document', async () => {
    const db = createScriptedExecutor([
      [certificateRow({ verification_status: 'EXTRACTED' })],
      [{ id: CERTIFICATE_ID, review_id: 'r2', event_id: '43' }],
    ]);

    const result = await decideCertificate(db as never, {
      certificateId: CERTIFICATE_ID,
      decision: 'REJECT',
      actorId: ACTOR_ID,
      note: 'Document is a duplicate of K1161-NSC',
    });

    expect(result).toMatchObject({ decision: 'REJECT', fromStatus: 'EXTRACTED', toStatus: 'REJECTED' });

    const write = db.queries[1];
    expect(write?.values).toContain('REJECT');
    expect(write?.values).toContain('REJECTED');
    expect(write?.values).toContain('REJECT_CERTIFICATE');
    expect(write?.text).not.toMatch(/\bDELETE\b/);
    expect(write?.text).not.toContain('deleted_at =');
  });

  it('refuses a document that is already rejected', async () => {
    const db = createScriptedExecutor([[certificateRow({ verification_status: 'REJECTED' })]]);

    await expect(
      decideCertificate(db as never, {
        certificateId: CERTIFICATE_ID,
        decision: 'REJECT',
        actorId: ACTOR_ID,
        note: 'Second look',
      }),
    ).rejects.toMatchObject({ code: 'CERTIFICATE_TERMINAL_STATE' });
  });

  it('refuses a decision that lost the race', async () => {
    const db = createScriptedExecutor([
      [certificateRow()],
      highConfidenceFields(),
      [],
      [],
    ]);

    await expect(
      decideCertificate(db as never, {
        certificateId: CERTIFICATE_ID,
        decision: 'APPROVE',
        actorId: ACTOR_ID,
      }),
    ).rejects.toMatchObject({ code: 'ALREADY_DECIDED' });
  });
});
