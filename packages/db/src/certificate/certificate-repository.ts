/**
 * packages/db/src/certificate/certificate-repository.ts
 *
 * Authority:
 *   - technical_design/17_CERTIFICATE_INTELLIGENCE.md
 *   - PROJECT_SOURCE_OF_TRUTH.md Section 8.10, 18.7
 *   - packages/db/migrations/0010_trust.sql & 0017_trust_view.sql
 *
 * Implements:
 *   - Creation and retrieval of certificates
 *   - OCR run tracking
 *   - Field extractions with per-field confidence & bbox
 *   - Anomaly recording and retrieval
 *   - Human review recording & field overrides
 *   - Append-only verification_events trust ledger
 *   - Public read model via `certificate_public` view (enforcing INV-07)
 */
export type DbClient = {
  query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
};
import type {
  CertificateExtractionSchema,
  AnomalyReport,
  VerificationStatus,
  DocumentKind,
} from '@maihan/domain';

export interface CertificateRow {
  readonly id: string;
  readonly kind: DocumentKind;
  readonly gemstone_id: string | null;
  readonly configuration_id: string | null;
  readonly product_id: string | null;
  readonly lab_name: string | null;
  readonly certificate_number: string | null;
  readonly issue_date: string | null;
  readonly report_type: string | null;
  readonly verification_status: VerificationStatus;
  readonly confidence_overall: number | null;
  readonly state: string;
  readonly source_url: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}

export interface CertificatePublicViewRow {
  readonly id: string;
  readonly kind: string;
  readonly gemstone_id: string | null;
  readonly configuration_id: string | null;
  readonly product_id: string | null;
  readonly verification_status: VerificationStatus;
  readonly confidence_overall: number | null;
  readonly lab_name: string | null;
  readonly field_name: string | null;
  readonly normalized_value: string | null;
  readonly numeric_value: number | null;
  readonly confidence: number | null;
  readonly field_status: VerificationStatus | null;
}

export interface CreateCertificateInput {
  readonly kind: DocumentKind;
  readonly gemstoneId?: string | null;
  readonly configurationId?: string | null;
  readonly productId?: string | null;
  readonly sourceUrl?: string | null;
}

export async function createCertificate(
  client: DbClient | any,
  input: CreateCertificateInput,
): Promise<CertificateRow> {
  const query = `
    INSERT INTO certificates (
      kind, gemstone_id, configuration_id, product_id, source_url, verification_status
    ) VALUES ($1, $2, $3, $4, $5, 'UNVERIFIED')
    RETURNING *;
  `;
  const res = await client.query(query, [
    input.kind,
    input.gemstoneId ?? null,
    input.configurationId ?? null,
    input.productId ?? null,
    input.sourceUrl ?? null,
  ]);
  return res.rows[0];
}

export async function getCertificateById(
  client: DbClient | any,
  id: string,
): Promise<CertificateRow | null> {
  const res = await client.query('SELECT * FROM certificates WHERE id = $1 AND deleted_at IS NULL;', [id]);
  return res.rows[0] ?? null;
}

export async function recordOcrRun(
  client: DbClient | any,
  params: {
    readonly certificateId: string;
    readonly runId: string;
    readonly provider: string;
    readonly modelName: string;
    readonly modelVersion: string;
    readonly status: string;
    readonly fieldsExtracted: number;
    readonly meanConfidence: number;
    readonly rawResponse?: Record<string, unknown>;
  },
): Promise<void> {
  const query = `
    INSERT INTO certificate_ocr_runs (
      certificate_id, run_id, provider, model_name, model_version, status,
      fields_extracted, mean_confidence, raw_response, finished_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now());
  `;
  await client.query(query, [
    params.certificateId,
    params.runId,
    params.provider,
    params.modelName,
    params.modelVersion,
    params.status,
    params.fieldsExtracted,
    params.meanConfidence,
    JSON.stringify(params.rawResponse ?? {}),
  ]);
}

export async function persistExtractions(
  client: DbClient | any,
  params: {
    readonly certificateId: string;
    readonly runId: string;
    readonly extraction: CertificateExtractionSchema;
    readonly modelProvider: string;
    readonly modelName: string;
    readonly modelVersion: string;
    readonly promptVersion: string;
  },
): Promise<void> {
  const { certificateId, runId, extraction, modelProvider, modelName, modelVersion, promptVersion } = params;

  const fields: Array<{
    name: string;
    rawText: string | null;
    normVal: string | null;
    numVal: number | null;
    conf: number;
    bbox: any;
  }> = [
    {
      name: 'lab_name',
      rawText: extraction.lab_name.rawText ?? extraction.lab_name.value,
      normVal: extraction.lab_name.value,
      numVal: null,
      conf: extraction.lab_name.confidence,
      bbox: extraction.lab_name.bbox ?? null,
    },
    {
      name: 'report_type',
      rawText: extraction.report_type.rawText ?? extraction.report_type.value,
      normVal: extraction.report_type.value,
      numVal: null,
      conf: extraction.report_type.confidence,
      bbox: extraction.report_type.bbox ?? null,
    },
    {
      name: 'certificate_number',
      rawText: extraction.certificate_number.rawText ?? extraction.certificate_number.value,
      normVal: extraction.certificate_number.value,
      numVal: null,
      conf: extraction.certificate_number.confidence,
      bbox: extraction.certificate_number.bbox ?? null,
    },
    {
      name: 'issue_date',
      rawText: extraction.issue_date.rawText ?? extraction.issue_date.value,
      normVal: extraction.issue_date.value,
      numVal: null,
      conf: extraction.issue_date.confidence,
      bbox: extraction.issue_date.bbox ?? null,
    },
    {
      name: 'weight_ct',
      rawText: extraction.stone.weight_ct.rawText ?? (extraction.stone.weight_ct.value ? String(extraction.stone.weight_ct.value) : null),
      normVal: extraction.stone.weight_ct.value ? String(extraction.stone.weight_ct.value) : null,
      numVal: extraction.stone.weight_ct.value,
      conf: extraction.stone.weight_ct.confidence,
      bbox: extraction.stone.weight_ct.bbox ?? null,
    },
    {
      name: 'origin',
      rawText: extraction.origin.rawText ?? extraction.origin.value,
      normVal: extraction.origin.value,
      numVal: null,
      conf: extraction.origin.confidence,
      bbox: extraction.origin.bbox ?? null,
    },
  ];

  for (const f of fields) {
    const query = `
      INSERT INTO certificate_extractions (
        certificate_id, run_id, field_name, raw_text, normalized_value, numeric_value,
        confidence, bbox, model_provider, model_name, model_version, prompt_version,
        evidence_status, verification_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'INFERRED', 'EXTRACTED')
      ON CONFLICT (certificate_id, run_id, field_name) DO UPDATE SET
        normalized_value = EXCLUDED.normalized_value,
        numeric_value = EXCLUDED.numeric_value,
        confidence = EXCLUDED.confidence;
    `;
    await client.query(query, [
      certificateId,
      runId,
      f.name,
      f.rawText,
      f.normVal,
      f.numVal,
      f.conf,
      f.bbox ? JSON.stringify(f.bbox) : null,
      modelProvider,
      modelName,
      modelVersion,
      promptVersion,
    ]);
  }
}

export async function recordAnomalies(
  client: DbClient | any,
  certificateId: string,
  runId: string | null,
  anomalies: ReadonlyArray<AnomalyReport>,
): Promise<void> {
  for (const a of anomalies) {
    const query = `
      INSERT INTO certificate_anomalies (
        certificate_id, run_id, anomaly_type, severity, detail
      ) VALUES ($1, $2, $3, $4, $5);
    `;
    await client.query(query, [certificateId, runId, a.type, a.severity, JSON.stringify(a.detail)]);
  }
}

export async function getCertificateAnomalies(
  client: DbClient | any,
  certificateId: string,
): Promise<any[]> {
  const res = await client.query(
    'SELECT * FROM certificate_anomalies WHERE certificate_id = $1 ORDER BY created_at ASC;',
    [certificateId],
  );
  return res.rows;
}

export async function recordVerificationEvent(
  client: DbClient | any,
  params: {
    readonly certificateId: string;
    readonly eventType: string;
    readonly fromStatus: VerificationStatus | null;
    readonly toStatus: VerificationStatus;
    readonly actorType: string;
    readonly actorId?: string | null;
    readonly detail?: Record<string, unknown>;
  },
): Promise<void> {
  const query = `
    INSERT INTO verification_events (
      certificate_id, event_type, from_status, to_status, actor_type, actor_id, detail
    ) VALUES ($1, $2, $3, $4, $5, $6, $7);
  `;
  await client.query(query, [
    params.certificateId,
    params.eventType,
    params.fromStatus,
    params.toStatus,
    params.actorType,
    params.actorId ?? null,
    JSON.stringify(params.detail ?? {}),
  ]);
}

export async function updateCertificateStatus(
  client: DbClient | any,
  certificateId: string,
  status: VerificationStatus,
  confidenceOverall?: number | null,
  labName?: string | null,
  certNumber?: string | null,
): Promise<void> {
  const query = `
    UPDATE certificates
    SET verification_status = $2,
        confidence_overall = COALESCE($3, confidence_overall),
        lab_name = COALESCE($4, lab_name),
        certificate_number = COALESCE($5, certificate_number),
        updated_at = now()
    WHERE id = $1;
  `;
  await client.query(query, [certificateId, status, confidenceOverall ?? null, labName ?? null, certNumber ?? null]);
}

export async function recordHumanReview(
  client: DbClient | any,
  params: {
    readonly certificateId: string;
    readonly reviewerId: string;
    readonly decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
    readonly notes?: string | null;
    readonly fieldsOverridden?: Record<string, unknown>;
  },
): Promise<void> {
  const query = `
    INSERT INTO certificate_reviews (
      certificate_id, reviewer_id, decision, notes, fields_overridden
    ) VALUES ($1, $2, $3, $4, $5);
  `;
  await client.query(query, [
    params.certificateId,
    params.reviewerId,
    params.decision,
    params.notes ?? null,
    JSON.stringify(params.fieldsOverridden ?? {}),
  ]);
}

/**
 * Reads from the authoritative `certificate_public` view.
 * Guarantees that confidence < 0.50 values are withheld and INV-07 is strictly upheld.
 */
export async function getPublicCertificatesForGemstone(
  client: DbClient | any,
  gemstoneId: string,
): Promise<CertificatePublicViewRow[]> {
  const query = `
    SELECT * FROM certificate_public
    WHERE gemstone_id = $1;
  `;
  const res = await client.query(query, [gemstoneId]);
  return res.rows;
}
