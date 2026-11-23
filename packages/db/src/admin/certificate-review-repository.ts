/**
 * packages/db/src/admin/certificate-review-repository.ts
 *
 * Phase 12 — Global Task 10 (Track C7): the certificate review queue and the
 * human decision, plus anomaly triage.
 *
 * Authority:
 *   - technical_design/17_CERTIFICATE_INTELLIGENCE.md: confidence bands, the
 *     document-level verification threshold (every material field >= 0.90 and
 *     no unresolved ERROR anomaly, plus human approval), the state machine,
 *     and "every transition writes a verification_events row and an
 *     audit_logs row".
 *   - technical_design/23_ADMIN_CONSOLE_AND_RBAC.md §3: the `certificates`
 *     module belongs to TRUST_REVIEWER; §10 error codes.
 *   - packages/domain/src/certificate is the authority for the thresholds and
 *     the legal transitions. This module never re-implements 0.90 or 0.85.
 *
 * Rules enforced HERE, not in the console:
 *
 *   1. NO AUTO-PROMOTION. `decideCertificate` asks the domain state machine
 *      for the next status and lets it throw. A document below the 0.90
 *      whole-document threshold is refused with the domain's own code
 *      (`INSUFFICIENT_CONFIDENCE_FOR_VERIFICATION`); it is never quietly
 *      promoted, and it is never silently downgraded either.
 *   2. AN ERROR ANOMALY BLOCKS VERIFICATION. Doc 17 is explicit; the count is
 *      read in this module and the refusal is `CERTIFICATE_ANOMALY`.
 *   3. THE LEDGER IS APPEND-ONLY. `verification_events` is INSERT-only here;
 *      there is no UPDATE and no DELETE path.
 *   4. ONE DECISION PER DOCUMENT. The status update carries
 *      `verification_status = <the status that was read>` in its WHERE clause,
 *      so a concurrent decision loses and writes no ledger row.
 *   5. THE DECISION, THE LEDGER, THE REVIEW AND THE AUDIT ROW ARE ONE
 *      STATEMENT (data-modifying CTEs). A decided certificate without its
 *      audit trail is not representable.
 *   6. INV-07 AT READ TIME. Every field carries its confidence band and
 *      `publicly_displayable` (>= 0.50) from the domain policy, so the review
 *      panel cannot render a sub-threshold value as fact.
 *   7. AN ANOMALY IS RESOLVED, NEVER ERASED. `resolveAnomaly` records
 *      `resolved_at` / `resolved_by` / `resolution` once; a second resolution is
 *      refused (409 semantics) and there is no DELETE path.
 *   8. TWO-PERSON APPROVAL. Approval to VERIFIED requires an approver different
 *      from the last recorded human actor on the document
 *      (`verification_events.actor_type='HUMAN'`). No recorded editor satisfies
 *      the rule and the fact is written into the audit snapshot.
 *
 * No database connection and no transaction is opened here: the caller
 * supplies the executor (technical_design/03).
 */
import { sql } from 'drizzle-orm';
import {
  assessMaterialFields,
  assertTwoPerson,
  canPromoteToVerified,
  certificateApprovalEntityKind,
  evaluateConfidenceBand,
  isFieldPubliclyDisplayable,
  transitionCertificateStatus,
  twoPersonAuditFields,
  twoPersonRuleFor,
  type CertificateExtractionSchema,
  type ConfidenceBand,
  type ExtractedField,
  type MaterialFieldAssessment,
  type TwoPersonAuditFields,
  type VerificationStatus,
} from '@maihan/domain';
import type { CatalogDatabase } from '../catalog/executor.js';

export type CertificateReviewErrorCode =
  | 'NOT_FOUND'
  | 'NOTE_REQUIRED'
  | 'UNRESOLVED_ERROR_ANOMALY'
  | 'ALREADY_DECIDED'
  | 'ANOMALY_NOT_FOUND'
  | 'ANOMALY_ALREADY_RESOLVED'
  | 'RESOLUTION_REQUIRED';

export class CertificateReviewError extends Error {
  constructor(readonly code: CertificateReviewErrorCode) {
    super(`CERTIFICATE_REVIEW: ${code}`);
    this.name = 'CertificateReviewError';
  }
}

const MAX_LIMIT = 200;

function pageSize(query: { readonly limit: number; readonly offset: number }): {
  limit: number;
  offset: number;
} {
  const rawLimit = Number.isFinite(query.limit) ? Math.trunc(query.limit) : 50;
  const rawOffset = Number.isFinite(query.offset) ? Math.trunc(query.offset) : 0;
  return {
    limit: Math.min(Math.max(rawLimit, 1), MAX_LIMIT),
    offset: Math.max(rawOffset, 0),
  };
}

function count(value: unknown): number {
  return Number(value ?? 0);
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// --- Queue ----------------------------------------------------------------

export interface PendingCertificateRow extends Record<string, unknown> {
  readonly id: string;
  readonly kind: string;
  readonly gemstone_id: string | null;
  readonly configuration_id: string | null;
  readonly product_id: string | null;
  /** Gemstone ref or product slug — whatever the document is attached to. */
  readonly subject_ref: string | null;
  readonly lab_name: string | null;
  readonly certificate_number: string | null;
  readonly issue_date: string | null;
  readonly report_type: string | null;
  readonly verification_status: VerificationStatus;
  readonly confidence_overall: number | null;
  readonly source_url: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly field_count: number;
  readonly min_confidence: number | null;
  readonly open_error_anomalies: number;
  readonly open_warn_anomalies: number;
}

interface PendingCertificateDbRow extends Record<string, unknown> {
  id: string;
  kind: string;
  gemstone_id: string | null;
  configuration_id: string | null;
  product_id: string | null;
  subject_ref: string | null;
  lab_name: string | null;
  certificate_number: string | null;
  issue_date: string | null;
  report_type: string | null;
  verification_status: string;
  confidence_overall: unknown;
  source_url: string | null;
  created_at: string;
  updated_at: string;
  field_count: unknown;
  min_confidence: unknown;
  open_error_anomalies: unknown;
  open_warn_anomalies: unknown;
}

/** Statuses a human can still act on. VERIFIED and REJECTED are terminal. */
const PENDING_STATUSES = sql`('UNVERIFIED', 'EXTRACTED', 'CROSS_CHECKED')`;

/**
 * The queue projection. `open_error_anomalies` and `min_confidence` are
 * computed once in the CTE and reused by the ORDER BY, so the console cannot
 * disagree with the sort: anomalies first, then the least confident document.
 */
const PENDING_SELECT = sql`
  SELECT c.id,
         c.kind::text AS kind,
         c.gemstone_id,
         c.configuration_id,
         c.product_id,
         COALESCE(g.gem_ref, p.slug) AS subject_ref,
         c.lab_name,
         c.certificate_number,
         c.issue_date::text AS issue_date,
         c.report_type,
         c.verification_status::text AS verification_status,
         c.confidence_overall,
         c.source_url,
         c.created_at,
         c.updated_at,
         (SELECT count(*) FROM certificate_extractions x
           WHERE x.certificate_id = c.id) AS field_count,
         (SELECT min(x.confidence) FROM certificate_extractions x
           WHERE x.certificate_id = c.id) AS min_confidence,
         (SELECT count(*) FROM certificate_anomalies a
           WHERE a.certificate_id = c.id AND a.resolved_at IS NULL
             AND a.severity = 'ERROR') AS open_error_anomalies,
         (SELECT count(*) FROM certificate_anomalies a
           WHERE a.certificate_id = c.id AND a.resolved_at IS NULL
             AND a.severity = 'WARN') AS open_warn_anomalies
    FROM certificates c
    LEFT JOIN gemstones g ON g.id = c.gemstone_id
    LEFT JOIN products p ON p.id = c.product_id
`;

function toPendingRow(row: PendingCertificateDbRow): PendingCertificateRow {
  return {
    id: row.id,
    kind: row.kind,
    gemstone_id: row.gemstone_id,
    configuration_id: row.configuration_id,
    product_id: row.product_id,
    subject_ref: row.subject_ref,
    lab_name: row.lab_name,
    certificate_number: row.certificate_number,
    issue_date: row.issue_date,
    report_type: row.report_type,
    verification_status: row.verification_status as VerificationStatus,
    confidence_overall: nullableNumber(row.confidence_overall),
    source_url: row.source_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    field_count: count(row.field_count),
    min_confidence: nullableNumber(row.min_confidence),
    open_error_anomalies: count(row.open_error_anomalies),
    open_warn_anomalies: count(row.open_warn_anomalies),
  };
}

export interface ListPendingCertificatesQuery {
  readonly limit: number;
  readonly offset: number;
}

export interface PendingCertificatesPage {
  readonly items: PendingCertificateRow[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export async function listPendingCertificates(
  db: CatalogDatabase,
  query: ListPendingCertificatesQuery,
): Promise<PendingCertificatesPage> {
  const { limit, offset } = pageSize(query);

  const rows = await db.execute<PendingCertificateDbRow>(sql`
    WITH pending AS (
      ${PENDING_SELECT}
       WHERE c.deleted_at IS NULL
         AND c.verification_status::text IN ${PENDING_STATUSES}
    )
    SELECT *
      FROM pending
     ORDER BY (open_error_anomalies > 0) DESC,
              min_confidence ASC NULLS FIRST,
              created_at ASC,
              id ASC
     LIMIT ${limit} OFFSET ${offset}
  `);

  const total = await db.execute<{ count: unknown }>(sql`
    SELECT count(*) AS count
      FROM certificates c
     WHERE c.deleted_at IS NULL
       AND c.verification_status::text IN ${PENDING_STATUSES}
  `);

  return {
    items: rows.rows.map(toPendingRow),
    total: count(total.rows[0]?.count),
    limit,
    offset,
  };
}

// --- Detail ---------------------------------------------------------------

export interface CertificateExtractionRow extends Record<string, unknown> {
  readonly field_name: string;
  readonly raw_text: string | null;
  readonly normalized_value: string | null;
  readonly numeric_value: number | null;
  readonly confidence: number;
  readonly bbox: unknown;
  readonly verification_status: string;
  readonly evidence_status: string;
  readonly model_name: string;
  readonly extracted_at: string;
}

export interface CertificateAnomalyRow extends Record<string, unknown> {
  readonly id: string;
  readonly anomaly_type: string;
  readonly severity: 'INFO' | 'WARN' | 'ERROR';
  readonly detail: unknown;
  readonly created_at: string;
  readonly resolved_at: string | null;
  readonly resolved_by: string | null;
  readonly resolution: string | null;
  /** Derived, never stored: an anomaly is open exactly when it is unresolved. */
  readonly is_open: boolean;
}

interface CertificateAnomalyDbRow extends Record<string, unknown> {
  id: string;
  anomaly_type: string;
  severity: 'INFO' | 'WARN' | 'ERROR';
  detail: unknown;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution: string | null;
}

interface ResolvedAnomalyDbRow extends CertificateAnomalyDbRow {
  certificate_id: string;
}

function toAnomalyRow(row: CertificateAnomalyDbRow): CertificateAnomalyRow {
  return {
    id: row.id,
    anomaly_type: row.anomaly_type,
    severity: row.severity,
    detail: row.detail,
    created_at: row.created_at,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
    resolution: row.resolution,
    is_open: row.resolved_at === null,
  };
}

export interface CertificateReviewRecord extends Record<string, unknown> {
  readonly id: string;
  readonly reviewer_id: string;
  readonly decision: string;
  readonly notes: string | null;
  readonly created_at: string;
}

/** One extracted field as the review panel sees it. */
export interface ReviewedField {
  readonly fieldName: string;
  readonly rawText: string | null;
  readonly normalizedValue: string | null;
  readonly numericValue: number | null;
  readonly confidence: number;
  readonly band: ConfidenceBand;
  /** INV-07 read-time rule: below 0.50 is never displayable as fact. */
  readonly publiclyDisplayable: boolean;
  readonly bbox: unknown;
  readonly verificationStatus: string;
  readonly evidenceStatus: string;
  readonly isMaterial: boolean;
}

export interface CertificateReviewDetail {
  readonly certificate: PendingCertificateRow;
  readonly fields: readonly ReviewedField[];
  /** The domain's material-field assessment — the 0.90 threshold input. */
  readonly materialFields: readonly MaterialFieldAssessment[];
  readonly anomalies: readonly CertificateAnomalyRow[];
  readonly openErrorAnomalies: number;
  readonly openWarnAnomalies: number;
  readonly latestReview: CertificateReviewRecord | null;
  /** True only when the domain would allow a human APPROVE right now. */
  readonly verifiable: boolean;
}

interface ExtractionDbRow extends Record<string, unknown> {
  field_name: string;
  raw_text: string | null;
  normalized_value: string | null;
  numeric_value: unknown;
  confidence: unknown;
  bbox: unknown;
  verification_status: string;
  evidence_status: string;
  model_name: string;
  extracted_at: string;
}

function toExtractionRow(row: ExtractionDbRow): CertificateExtractionRow {
  return {
    field_name: row.field_name,
    raw_text: row.raw_text,
    normalized_value: row.normalized_value,
    numeric_value: nullableNumber(row.numeric_value),
    confidence: nullableNumber(row.confidence) ?? 0,
    bbox: row.bbox,
    verification_status: row.verification_status,
    evidence_status: row.evidence_status,
    model_name: row.model_name,
    extracted_at: row.extracted_at,
  };
}

function extractedField(
  row: CertificateExtractionRow | undefined,
  numeric: boolean,
): ExtractedField<string | number | null> {
  if (row === undefined) return { value: null, confidence: 0 };
  const value = numeric
    ? (row.numeric_value ?? (row.normalized_value === null ? null : Number(row.normalized_value)))
    : row.normalized_value;
  return {
    value: numeric && typeof value === 'number' && Number.isNaN(value) ? null : value,
    confidence: row.confidence,
  };
}

/**
 * Rebuild the extraction contract from the per-field rows so the DOMAIN
 * functions (`assessMaterialFields`, `canPromoteToVerified`) are the only
 * place a threshold is expressed. A missing row is confidence 0.0, never an
 * implicit pass (doc 17, extraction contract).
 */
export function extractionSchemaFromFields(
  fields: readonly CertificateExtractionRow[],
): CertificateExtractionSchema {
  const byName = new Map(fields.map((field) => [field.field_name, field]));
  const treatments = fields
    .filter((field) => field.field_name.startsWith('treatment'))
    .map((field) => ({
      value: field.normalized_value ?? '',
      confidence: field.confidence,
    }));

  return {
    lab_name: extractedField(byName.get('lab_name'), false) as ExtractedField<string | null>,
    report_type: extractedField(byName.get('report_type'), false) as ExtractedField<string | null>,
    certificate_number: extractedField(byName.get('certificate_number'), false) as ExtractedField<string | null>,
    issue_date: extractedField(byName.get('issue_date'), false) as ExtractedField<string | null>,
    stone: {
      weight_ct: extractedField(byName.get('weight_ct'), true) as ExtractedField<number | null>,
      length_mm: extractedField(byName.get('length_mm'), true) as ExtractedField<number | null>,
      width_mm: extractedField(byName.get('width_mm'), true) as ExtractedField<number | null>,
      depth_mm: extractedField(byName.get('depth_mm'), true) as ExtractedField<number | null>,
    },
    treatments,
    origin: extractedField(byName.get('origin'), false) as ExtractedField<string | null>,
  };
}

async function readCertificate(
  db: CatalogDatabase,
  certificateId: string,
): Promise<PendingCertificateRow | null> {
  const rows = await db.execute<PendingCertificateDbRow>(sql`
    ${PENDING_SELECT}
     WHERE c.id = ${certificateId}::uuid
       AND c.deleted_at IS NULL
  `);
  const row = rows.rows[0];
  return row === undefined ? null : toPendingRow(row);
}

async function readFields(
  db: CatalogDatabase,
  certificateId: string,
): Promise<CertificateExtractionRow[]> {
  const rows = await db.execute<ExtractionDbRow>(sql`
    SELECT DISTINCT ON (x.field_name)
           x.field_name,
           x.raw_text,
           x.normalized_value,
           x.numeric_value,
           x.confidence,
           x.bbox,
           x.verification_status::text AS verification_status,
           x.evidence_status::text AS evidence_status,
           x.model_name,
           x.extracted_at
      FROM certificate_extractions x
     WHERE x.certificate_id = ${certificateId}::uuid
     ORDER BY x.field_name, x.extracted_at DESC
  `);
  return rows.rows.map(toExtractionRow);
}

async function readAnomalies(
  db: CatalogDatabase,
  certificateId: string,
): Promise<CertificateAnomalyRow[]> {
  const rows = await db.execute<CertificateAnomalyDbRow>(sql`
    SELECT a.id, a.anomaly_type, a.severity, a.detail, a.created_at,
           a.resolved_at, a.resolved_by, a.resolution
      FROM certificate_anomalies a
     WHERE a.certificate_id = ${certificateId}::uuid
       AND a.resolved_at IS NULL
     ORDER BY CASE a.severity WHEN 'ERROR' THEN 0 WHEN 'WARN' THEN 1 ELSE 2 END,
              a.created_at ASC
  `);
  return rows.rows.map(toAnomalyRow);
}

async function readLatestReview(
  db: CatalogDatabase,
  certificateId: string,
): Promise<CertificateReviewRecord | null> {
  const rows = await db.execute<CertificateReviewRecord>(sql`
    SELECT r.id, r.reviewer_id, r.decision, r.notes, r.created_at
      FROM certificate_reviews r
     WHERE r.certificate_id = ${certificateId}::uuid
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT 1
  `);
  return rows.rows[0] ?? null;
}

/**
 * The last human who acted on this document, from the append-only trust
 * ledger. That is the recorded editor the two-person rule compares against:
 * a reviewer who submitted or rejected an extraction is recorded here, and a
 * document no human has touched returns null (the rule is then satisfied and
 * the audit snapshot says `editor_unrecorded: true`).
 */
async function readLastHumanActor(
  db: CatalogDatabase,
  certificateId: string,
): Promise<string | null> {
  const rows = await db.execute<{ actor_id: string | null }>(sql`
    SELECT v.actor_id
      FROM verification_events v
     WHERE v.certificate_id = ${certificateId}::uuid
       AND v.actor_type = 'HUMAN'
       AND v.actor_id IS NOT NULL
     ORDER BY v.id DESC
     LIMIT 1
  `);
  return rows.rows[0]?.actor_id ?? null;
}

export async function getCertificateForReview(
  db: CatalogDatabase,
  certificateId: string,
): Promise<CertificateReviewDetail | null> {
  const certificate = await readCertificate(db, certificateId);
  if (certificate === null) return null;

  const [fields, anomalies, latestReview] = await Promise.all([
    readFields(db, certificateId),
    readAnomalies(db, certificateId),
    readLatestReview(db, certificateId),
  ]);

  const schema = extractionSchemaFromFields(fields);
  const materialFields = assessMaterialFields(schema);
  const materialNames = new Set(materialFields.map((field) => field.fieldName));
  const openErrorAnomalies = anomalies.filter((anomaly) => anomaly.severity === 'ERROR').length;
  const openWarnAnomalies = anomalies.filter((anomaly) => anomaly.severity === 'WARN').length;

  return {
    certificate,
    fields: fields.map((field) => ({
      fieldName: field.field_name,
      rawText: field.raw_text,
      normalizedValue: field.normalized_value,
      numericValue: field.numeric_value,
      confidence: field.confidence,
      band: evaluateConfidenceBand(field.confidence),
      publiclyDisplayable: isFieldPubliclyDisplayable(field.confidence),
      bbox: field.bbox,
      verificationStatus: field.verification_status,
      evidenceStatus: field.evidence_status,
      isMaterial: materialNames.has(field.field_name),
    })),
    materialFields,
    anomalies,
    openErrorAnomalies,
    openWarnAnomalies,
    latestReview,
    verifiable: canPromoteToVerified(schema, openErrorAnomalies > 0, true),
  };
}

// --- Anomaly triage -------------------------------------------------------

export interface CertificateAnomalyList {
  readonly certificateId: string;
  /** Open and resolved, oldest first — the record, not just the blockers. */
  readonly items: readonly CertificateAnomalyRow[];
  readonly open: number;
  readonly resolved: number;
}

/**
 * Every anomaly recorded against a document, resolved ones included, oldest
 * first. Resolution is a recorded fact, so the console must be able to show
 * what blocked a document and how it was cleared — hiding resolved rows would
 * make the history unreadable.
 */
export async function listAnomaliesForCertificate(
  db: CatalogDatabase,
  certificateId: string,
): Promise<CertificateAnomalyList | null> {
  const certificate = await readCertificate(db, certificateId);
  if (certificate === null) return null;

  const rows = await db.execute<CertificateAnomalyDbRow>(sql`
    SELECT a.id, a.anomaly_type, a.severity, a.detail, a.created_at,
           a.resolved_at, a.resolved_by, a.resolution
      FROM certificate_anomalies a
     WHERE a.certificate_id = ${certificateId}::uuid
     ORDER BY a.created_at ASC, a.id ASC
  `);
  const items = rows.rows.map(toAnomalyRow);
  const resolved = items.filter((item) => !item.is_open).length;

  return {
    certificateId,
    items,
    open: items.length - resolved,
    resolved,
  };
}

export interface ResolveAnomalyInput {
  readonly anomalyId: string;
  readonly actorId: string;
  /** The recorded resolution — a short, reviewable statement of what was done. */
  readonly resolution: string;
  /** Optional human detail; kept in the audit snapshot, never instead of it. */
  readonly note?: string;
  readonly requestId?: string;
}

export interface ResolveAnomalyResult {
  readonly anomaly: CertificateAnomalyRow;
  readonly certificateId: string;
  readonly resolvedAt: string;
  readonly note: string | null;
}

/**
 * Resolve one anomaly exactly once.
 *
 * Single-use is a WHERE clause (`resolved_at IS NULL`), not a read-then-write:
 * two concurrent resolutions cannot both win. The update, the resolution
 * columns and the before/after audit row are ONE data-modifying CTE statement,
 * and the anomaly row is never deleted — the resolution is a record.
 *
 * A failure costs a second read only to say WHICH refusal it is (unknown
 * anomaly vs already resolved); the success path stays one statement.
 */
export async function resolveAnomaly(
  db: CatalogDatabase,
  input: ResolveAnomalyInput,
): Promise<ResolveAnomalyResult> {
  const resolution = input.resolution.trim();
  if (resolution.length === 0) throw new CertificateReviewError('RESOLUTION_REQUIRED');
  const note = (input.note ?? '').trim();
  const recordedNote = note.length === 0 ? null : note;
  const reason = recordedNote ?? 'Anomaly resolved from the admin console';

  const resolved = await db.execute<ResolvedAnomalyDbRow>(sql`
    WITH target AS (
      SELECT a.id, a.certificate_id, a.anomaly_type, a.severity
        FROM certificate_anomalies a
       WHERE a.id = ${input.anomalyId}::uuid
       FOR UPDATE
    ), resolved AS (
      UPDATE certificate_anomalies a
         SET resolved_at = now(),
             resolved_by = ${input.actorId}::uuid,
             resolution = ${resolution}
        FROM target t
       WHERE a.id = t.id
         AND a.resolved_at IS NULL
      RETURNING a.id, a.anomaly_type, a.severity, a.detail, a.created_at,
                a.resolved_at, a.resolved_by, a.resolution, a.certificate_id
    ), logged AS (
      INSERT INTO audit_logs (
        actor_type, actor_id, action, entity_type, entity_id,
        before_state, after_state, diff, request_id, reason
      )
      SELECT 'ADMIN', ${input.actorId}::uuid, 'RESOLVE_CERTIFICATE_ANOMALY',
             'certificate_anomalies', r.id,
             jsonb_build_object('resolved_at', NULL, 'resolution', NULL),
             jsonb_build_object(
               'resolved_at', r.resolved_at,
               'resolved_by', r.resolved_by,
               'resolution', r.resolution,
               'certificate_id', r.certificate_id,
               'note', ${recordedNote}::text
             ),
             jsonb_build_object(
               'anomaly_type', t.anomaly_type,
               'severity', t.severity,
               'resolution', r.resolution
             ),
             ${input.requestId ?? null}::text,
             ${reason}::text
        FROM resolved r
        JOIN target t ON t.id = r.id
      RETURNING id
    )
    SELECT r.id, r.anomaly_type, r.severity, r.detail, r.created_at,
           r.resolved_at, r.resolved_by, r.resolution, r.certificate_id
      FROM resolved r
  `);

  const row = resolved.rows[0];
  if (row === undefined) {
    const existing = await db.execute<{ id: string; resolved_at: string | null }>(sql`
      SELECT a.id, a.resolved_at
        FROM certificate_anomalies a
       WHERE a.id = ${input.anomalyId}::uuid
    `);
    if (existing.rows[0] === undefined) throw new CertificateReviewError('ANOMALY_NOT_FOUND');
    throw new CertificateReviewError('ANOMALY_ALREADY_RESOLVED');
  }

  return {
    anomaly: toAnomalyRow(row),
    certificateId: row.certificate_id,
    resolvedAt: String(row.resolved_at),
    note: recordedNote,
  };
}

// --- Decision -------------------------------------------------------------

export type CertificateDecision = 'APPROVE' | 'REJECT';

export interface DecideCertificateInput {
  readonly certificateId: string;
  readonly decision: CertificateDecision;
  readonly actorId: string;
  /** Required for REJECT: an unexplained refusal is not reviewable. */
  readonly note?: string;
  readonly requestId?: string;
}

export interface DecideCertificateResult {
  readonly certificate: PendingCertificateRow;
  readonly decision: CertificateDecision;
  readonly fromStatus: VerificationStatus;
  readonly toStatus: VerificationStatus;
  readonly reviewId: string;
  readonly eventId: string;
  readonly materialFields: readonly MaterialFieldAssessment[];
  /** Both actors of the trust decision; null for a rejection. */
  readonly twoPerson: TwoPersonAuditFields | null;
}

interface DecidedRow extends Record<string, unknown> {
  id: string;
  review_id: string;
  event_id: string;
}

export async function decideCertificate(
  db: CatalogDatabase,
  input: DecideCertificateInput,
): Promise<DecideCertificateResult> {
  const note = (input.note ?? '').trim();
  if (input.decision === 'REJECT' && note.length === 0) {
    throw new CertificateReviewError('NOTE_REQUIRED');
  }

  const current = await db.execute<PendingCertificateDbRow>(sql`
    ${PENDING_SELECT}
     WHERE c.id = ${input.certificateId}::uuid
       AND c.deleted_at IS NULL
     FOR UPDATE OF c
  `);
  const row = current.rows[0];
  if (row === undefined) throw new CertificateReviewError('NOT_FOUND');
  const before = toPendingRow(row);
  const fromStatus = before.verification_status;

  let materialFields: readonly MaterialFieldAssessment[] = [];
  let toStatus: VerificationStatus;
  let twoPerson: TwoPersonAuditFields | null = null;

  if (input.decision === 'APPROVE') {
    const [fields, anomalies] = await Promise.all([
      readFields(db, input.certificateId),
      readAnomalies(db, input.certificateId),
    ]);
    const openErrors = anomalies.filter((anomaly) => anomaly.severity === 'ERROR').length;
    if (openErrors > 0) throw new CertificateReviewError('UNRESOLVED_ERROR_ANOMALY');

    const schema = extractionSchemaFromFields(fields);
    materialFields = assessMaterialFields(schema);
    // The domain owns the threshold: `canPromoteToVerified` is the >= 0.90
    // whole-document rule and it returns false for zero material fields.
    const allMaterialFieldsAbove90 = canPromoteToVerified(schema, false, true);
    // The domain owns the legal transitions and throws with its own code —
    // INSUFFICIENT_CONFIDENCE_FOR_VERIFICATION below 0.90, and
    // CERTIFICATE_TERMINAL_STATE / CERTIFICATE_ALREADY_VERIFIED when the
    // document can no longer move.
    toStatus = transitionCertificateStatus(fromStatus, {
      type: 'APPROVE',
      isHumanReviewer: true,
      allMaterialFieldsAbove90,
    });

    // Two-person rule (plan task 3): checked only once the decision is
    // otherwise legal, and always BEFORE the write statement. The "editor" is
    // the last recorded human actor on this document; a document no human has
    // touched has no editor and satisfies the rule.
    const rule = twoPersonRuleFor(certificateApprovalEntityKind(toStatus));
    const editorId = rule.required ? await readLastHumanActor(db, input.certificateId) : null;
    assertTwoPerson(rule, editorId, input.actorId);
    twoPerson = twoPersonAuditFields(rule, editorId, input.actorId);
  } else {
    toStatus = transitionCertificateStatus(fromStatus, {
      type: 'REJECT',
      reason: note,
    });
  }

  const eventType = input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  const auditAction = input.decision === 'APPROVE' ? 'APPROVE_CERTIFICATE' : 'REJECT_CERTIFICATE';
  const twoPersonJson = twoPerson === null ? null : JSON.stringify(twoPerson);

  const decided = await db.execute<DecidedRow>(sql`
    WITH decided AS (
      UPDATE certificates
         SET verification_status = ${toStatus}::verification_status,
             updated_at = now()
       WHERE id = ${input.certificateId}::uuid
         AND deleted_at IS NULL
         AND verification_status = ${fromStatus}::verification_status
      RETURNING id
    ), review AS (
      INSERT INTO certificate_reviews (certificate_id, reviewer_id, decision, notes)
      SELECT d.id, ${input.actorId}::uuid, ${input.decision}, ${note.length === 0 ? null : note}::text
        FROM decided d
      RETURNING id
    ), ledger AS (
      INSERT INTO verification_events (
        certificate_id, event_type, from_status, to_status, actor_type, actor_id, detail
      )
      SELECT d.id,
             ${eventType},
             ${fromStatus}::verification_status,
             ${toStatus}::verification_status,
             'HUMAN',
             ${input.actorId}::uuid,
             jsonb_build_object(
               'decision', ${input.decision}::text,
               'note', ${note.length === 0 ? null : note}::text,
               'review_id', r.id,
               'material_fields', ${JSON.stringify(materialFields)}::jsonb,
               'two_person', ${twoPersonJson}::jsonb
             )
        FROM decided d
        JOIN review r ON TRUE
      RETURNING id
    ), logged AS (
      INSERT INTO audit_logs (
        actor_type, actor_id, action, entity_type, entity_id,
        before_state, after_state, diff, request_id, reason
      )
      SELECT 'ADMIN', ${input.actorId}::uuid, ${auditAction}, 'certificates', d.id,
             jsonb_build_object('verification_status', ${fromStatus}::text),
             jsonb_build_object(
               'verification_status', ${toStatus}::text,
               'decision', ${input.decision}::text,
               'review_id', r.id,
               'verification_event_id', l.id,
               'two_person', ${twoPersonJson}::jsonb
             ),
             ${twoPersonJson}::jsonb,
             ${input.requestId ?? null}::text,
             ${note.length === 0 ? null : note}::text
        FROM decided d
        JOIN review r ON TRUE
        JOIN ledger l ON TRUE
      RETURNING id
    )
    SELECT d.id, r.id AS review_id, l.id AS event_id
      FROM decided d
      JOIN review r ON TRUE
      JOIN ledger l ON TRUE
  `);

  const written = decided.rows[0];
  if (written === undefined) {
    // The status guard lost a race: another decision moved the document.
    throw new CertificateReviewError('ALREADY_DECIDED');
  }

  return {
    certificate: { ...before, verification_status: toStatus },
    decision: input.decision,
    fromStatus,
    toStatus,
    reviewId: String(written.review_id),
    eventId: String(written.event_id),
    materialFields,
    twoPerson,
  };
}
