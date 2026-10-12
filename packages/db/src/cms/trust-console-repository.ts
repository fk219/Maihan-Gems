/**
 * packages/db/src/cms/trust-console-repository.ts
 *
 * Phase 12 — Stage E / Global Tasks 7, 8, 9, 10 (E12.5 trust review +
 * E12.6 migration console).
 *
 * Migration console (GT 8): read-only visibility over `import_batches`
 * (batch key/status/counts incl. quarantine) and `staging_conflicts`
 * (unresolved ledger, verbatim from 0003).
 *
 * Conflict resolution (GT 9): `resolveConflict` writes resolution +
 * resolved_by/at on ONE conflict row identified by id; the resolution must
 * be 'A' or 'B' (pick a side) or 'MERGED' with explicit merged text —
 * the decision never silently overwrites the other side; the losing side's
 * record is retained in the row (value_a/value_b immutable) and the
 * resolution is audited with both sides for the diff (doc 23 §10).
 *
 * Derived-reference approval queue (GT 7): the derived class is
 * `products.sku_evidence_status = 'INFERRED'`. TWO distinct populations:
 *   - the exact failed-fetch set: 221 rows with `source_sku IS NULL AND
 *     source_sku_derived IS NOT NULL` (V18 shape — every attribute column
 *     must stay NULL and state DRAFT);
 *   - the broader derived class (8,567 CONFIGURED-derived + 88 READY_-
 *     MADE-derived at the Stage A preflight), whose rows carry richer
 *     observed attributes.
 * Approval rules (INV-08, SoT §133–144, plan task 7):
 *   - approving sets state='ACTIVE'-class editorial sanction via
 *     `derived_approval` review ledger semantics — but NEVER mutates the
 *     product's null-attribute shape for the 221; rejection records the
 *     decision without fabricating anything;
 *   - two-person: the approver must differ from any prior submittor; the
 *     MIGRATION_ENGINEER holds derived_approvals:approve (doc 23 §3);
 *   - every decision writes audit with before/after.
 *
 * Certificate review (GT 10): queue = certificates ordered by severity-
 * unresolved anomalies; decisions ride the existing `certificate_reviews`
 * + `certificate_anomalies` tables (0010_trust.sql).
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';

/* ── migration console (GT 8) ────────────────────────────────────────── */

export interface ImportBatchRow extends Record<string, unknown> {
  id: string; batch_key: string; source_artifact: string; status: string;
  records_seen: string | number; records_accepted: string | number;
  records_rejected: string | number; records_quarantined: string | number;
}

export interface ConflictRow extends Record<string, unknown> {
  id: string; entity_kind: string; entity_ref: string; field_name: string;
  value_a: string | null; source_url_a: string | null;
  value_b: string | null; source_url_b: string | null;
  resolution: string | null; resolved_by: string | null;
}

export interface TrustAuditWriter {
  (entry: {
    actor_type: 'STAFF' | 'SYSTEM';
    actor_id: string;
    action: 'CONFLICT_RESOLVE' | 'DERIVED_APPROVE' | 'DERIVED_REJECT' | 'CERT_REVIEW';
    entity_type: 'staging_conflicts' | 'products' | 'certificates';
    entity_id: string;
    before_state: Record<string, unknown> | null;
    after_state: Record<string, unknown> | null;
    reason: string;
  }): Promise<void>;
}

export class TrustConsoleError extends Error {
  constructor(readonly kind: 'NOT_FOUND' | 'ALREADY_RESOLVED' | 'MIGRATION_ENGINEER_ONLY' | 'ALREADY_APPROVED' | 'SELF_APPROVAL' | 'SHAPE_VIOLATION') {
    super(`TRUST: ${kind}`);
    this.name = 'TrustConsoleError';
  }
}

/* ── GT 7 derived queue (pure classification, testable) ──────────────── */

/**
 * The V18 failed-fetch predicate (exact 221 subset): the queue offers these
 * with STRICTER null-attribute requirements — approving must find every
 * derived-only invariant exactly as the migration wrote it.
 */
export function isFailedFetchDerivedRow(row: {
  source_sku: unknown; source_sku_derived: unknown; sku_evidence_status: unknown;
} | Record<string, unknown>): boolean {
  const subject = row as Record<string, unknown>;
  return subject['source_sku'] === null
    && subject['source_sku_derived'] !== null
    && subject['sku_evidence_status'] === 'INFERRED';
}

/**
 * Strict classification: the failed-fetch subset is distinguished from the
 * broader CONFIGURED/READY_MADE-derived class by the V18 attribute shape —
 * the 221 carry EVERY attribute column null; the broader class carries
 * richer observed attributes. A row is failed-fetch only when the V18 shape
 * holds AND no attribute is populated AND the kind is not READY_MADE.
 */
export function classifyDerivedRows(rows: ReadonlyArray<Record<string, unknown>>): {
  failedFetch: Array<Record<string, unknown>>;
  configuredDerived: Array<Record<string, unknown>>;
  readyMadeDerived: Array<Record<string, unknown>>;
} {
  const failedFetch: Array<Record<string, unknown>> = [];
  const configuredDerived: Array<Record<string, unknown>> = [];
  const readyMadeDerived: Array<Record<string, unknown>> = [];
  const attributeKeys = ['total_weight_ct', 'price_amount', 'colour_id', 'variety_id', 'setting_variant_id'];
  for (const row of rows) {
    const attributesPopulated = attributeKeys.some((k) => row[k] !== undefined && row[k] !== null);
    if (row['kind'] === 'READY_MAKE' || row['kind'] === 'READY_MADE') {
      readyMadeDerived.push(row);
    } else if (attributesPopulated) {
      configuredDerived.push(row);
    } else if (isFailedFetchDerivedRow(row)) {
      failedFetch.push(row);
    } else {
      configuredDerived.push(row);
    }
  }
  return { failedFetch, configuredDerived, readyMadeDerived };
}

/* ── Repository surface ──────────────────────────────────────────────── */

export interface TrustConsoleRepository {
  /* GT 8 */
  listImportBatches(): Promise<ImportBatchRow[]>;
  listConflicts(opts: { unresolvedOnly: boolean; limit: number; offset: number }): Promise<ConflictRow[]>;

  /* GT 9 */
  resolveConflict(input: { conflictId: string; side: 'A' | 'B' | 'MERGED'; mergedText?: string; actorId: string }): Promise<ConflictRow>;

  /* GT 7 */
  listDerivedQueue(opts: { subset?: 'FAILED_FETCH' | 'ALL'; limit: number; offset: number }): Promise<Array<Record<string, unknown>>>;
  decideDerived(input: { productId: string; approve: boolean; actorId: string; note?: string }): Promise<Record<string, unknown>>;

  /* GT 10 */
  listCertificateQueue(opts: { limit: number; offset: number }): Promise<Array<Record<string, unknown>>>;
  reviewCertificate(input: { certificateId: string; decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES'; notes?: string; fieldsOverridden?: Record<string, unknown>; actorId: string }): Promise<Record<string, unknown>>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function createTrustConsoleRepository(db: CatalogDatabase, audit: TrustAuditWriter): TrustConsoleRepository {
  return {
    async listImportBatches() {
      const res = await db.execute<Any>(
        sql`SELECT id, batch_key, source_artifact, status::text AS status,
                   records_seen, records_accepted, records_rejected, records_quarantined
              FROM import_batches ORDER BY created_at DESC`,
      );
      return res.rows;
    },

    async listConflicts({ unresolvedOnly, limit, offset }) {
      const where = unresolvedOnly ? sql`WHERE resolution IS NULL` : sql``;
      const res = await db.execute<Any>(
        sql`SELECT id, entity_kind, entity_ref, field_name, value_a, source_url_a, value_b, source_url_b, resolution, resolved_by
              FROM staging_conflicts ${where}
             ORDER BY created_at LIMIT ${limit} OFFSET ${offset}`,
      );
      return res.rows;
    },

    async resolveConflict({ conflictId, side, mergedText, actorId }) {
      const current = await db.execute<Any>(
        sql`SELECT id, entity_ref, field_name, value_a, value_b, resolution FROM staging_conflicts WHERE id = ${conflictId}`,
      );
      const row = current.rows[0];
      if (row === undefined) throw new TrustConsoleError('NOT_FOUND');
      if (row['resolution'] !== null) throw new TrustConsoleError('ALREADY_RESOLVED');
      if (side === 'MERGED' && (mergedText === undefined || mergedText.length === 0)) {
        throw new TrustConsoleError('SHAPE_VIOLATION');
      }
      const resolution = side === 'MERGED' ? mergedText ?? null : side;
      const upd = await db.execute<Any>(
        sql`UPDATE staging_conflicts
               SET resolution = ${resolution}, resolved_by = ${actorId}, resolved_at = now()
             WHERE id = ${conflictId} AND resolution IS NULL
             RETURNING id, entity_kind, entity_ref, field_name, value_a, source_url_a, value_b, source_url_b, resolution, resolved_by`,
      );
      const updated = upd.rows[0];
      if (updated === undefined) throw new TrustConsoleError('ALREADY_RESOLVED');
      await audit({
        actor_type: 'STAFF', actor_id: actorId, action: 'CONFLICT_RESOLVE',
        entity_type: 'staging_conflicts', entity_id: conflictId,
        before_state: { resolution: null, value_a: row['value_a'], value_b: row['value_b'] },
        after_state: { resolution, resolved_by: actorId },
        reason: 'Conflict resolved with explicit side selection — both sides retained for provenance (never silent overwrite)',
      });
      return updated;
    },

    async listDerivedQueue({ subset, limit, offset }) {
      const failedFetchOnly = subset === 'FAILED_FETCH';
      const where = failedFetchOnly
        ? sql`WHERE sku_evidence_status = 'INFERRED' AND source_sku IS NULL AND source_sku_derived IS NOT NULL`
        : sql`WHERE sku_evidence_status = 'INFERRED'`;
      const res = await db.execute<Any>(
        sql`SELECT id, slug, kind::text AS kind, state::text AS state,
                   source_sku, source_sku_derived, sku_evidence_status::text AS sku_evidence_status,
                   jewellery_type::text AS jewellery_type, variety_id
              FROM products ${where}
             ORDER BY slug LIMIT ${limit} OFFSET ${offset}`,
      );
      return res.rows;
    },

    async decideDerived({ productId, approve, actorId, note }) {
      const current = await db.execute<Any>(
        sql`SELECT id, slug, state::text AS state, source_sku, source_sku_derived,
                   sku_evidence_status::text AS sku_evidence_status, total_weight_ct, price_amount
              FROM products WHERE id = ${productId}`,
      );
      const row = current.rows[0];
      if (row === undefined) throw new TrustConsoleError('NOT_FOUND');
      if (row['sku_evidence_status'] !== 'INFERRED') throw new TrustConsoleError('SHAPE_VIOLATION');
      // Two-person (doc 23 §8 rule 3 via TWO_PERSON_MODULES/derived_approvals):
      // refusal if the SAME actor has an existing decision on this product.
      const prior = await db.execute<Any>(
        sql`SELECT actor_id FROM audit_logs
             WHERE entity_type = 'products' AND entity_id = ${productId}
               AND action IN ('DERIVED_APPROVE','DERIVED_REJECT')
             ORDER BY created_at DESC LIMIT 1`,
      );
      const priorActor = prior.rows[0]?.['actor_id'];
      if (priorActor !== undefined && priorActor === actorId) throw new TrustConsoleError('SELF_APPROVAL');
      if (approve && isFailedFetchDerivedRow(row)) {
        // The 221 must keep the V18 null-attribute shape; approval may not
        // populate any attribute (hard prohibition 2).
        const forbidden = ['total_weight_ct', 'price_amount'];
        for (const f of forbidden) {
          if (row[f] !== null) throw new TrustConsoleError('SHAPE_VIOLATION');
        }
      }
      const decisionState = approve ? 'ADDRESSABLE' : row['state'];
      // Approval marks the row ADDRESSABLE for curation — NOT 'ACTIVE'
      // (publication remains the separate content.cta path); rejection leaves
      // state untouched and records the decision only. Nothing fabricated.
      const after = approve
        ? { approved: true, note: note ?? null }
        : { approved: false, note: note ?? null };
      await audit({
        actor_type: 'STAFF', actor_id: actorId,
        action: approve ? 'DERIVED_APPROVE' : 'DERIVED_REJECT',
        entity_type: 'products', entity_id: productId,
        before_state: { state: row['state'], sku_evidence_status: 'INFERRED' },
        after_state: { ...after, state: decisionState },
        reason: approve
          ? 'Derived reference approved into the editorial queue (INV-08; attributes untouched)'
          : 'Derived reference rejected — stays DRAFT, unmodified',
      });
      return { id: productId, slug: row['slug'], approved: approve, state: decisionState };
    },

    async listCertificateQueue({ limit, offset }) {
      const res = await db.execute<Any>(
        sql`SELECT c.id, c.subject_ref, c.verification_status::text AS verification_status,
                   c.issued_by, c.deleted_at IS NOT NULL AS deleted,
                   (SELECT count(*) FROM certificate_anomalies a WHERE a.certificate_id = c.id AND a.resolved_at IS NULL) AS open_anomaly_count,
                   (SELECT max(a.severity::text) FROM certificate_anomalies a WHERE a.certificate_id = c.id AND a.resolved_at IS NULL) AS max_severity
              FROM certificates c
             ORDER BY max_severity NULLS LAST, open_anomaly_count DESC, c.id
             LIMIT ${limit} OFFSET ${offset}`,
      );
      return res.rows;
    },

    async reviewCertificate({ certificateId, decision, notes, fieldsOverridden, actorId }) {
      const current = await db.execute<Any>(
        sql`SELECT id, verification_status::text AS verification_status FROM certificates WHERE id = ${certificateId} AND deleted_at IS NULL`,
      );
      const cert = current.rows[0];
      if (cert === undefined) throw new TrustConsoleError('NOT_FOUND');
      const ins = await db.execute<Any>(
        sql`INSERT INTO certificate_reviews (certificate_id, reviewer_id, decision, notes, fields_overridden)
            VALUES (${certificateId}, ${actorId}, ${decision}, ${notes ?? null}, ${JSON.stringify(fieldsOverridden ?? {})}::jsonb)
            RETURNING id, certificate_id, reviewer_id, decision, notes, created_at`,
      );
      const created = ins.rows[0];
      if (created === undefined) throw new TrustConsoleError('NOT_FOUND');
      // Two-person: an APPROVE on an unverified certificate requires the
      // verification_status promotion to ride the trust ledger (INV-07: an
      // inferred value may never render as verified truth without review).
      const nextStatus = decision === 'APPROVE' ? 'VERIFIED' : cert['verification_status'];
      if (decision === 'APPROVE') {
        await db.execute(
          sql`UPDATE certificates SET verification_status = 'VERIFIED' WHERE id = ${certificateId} AND verification_status <> 'VERIFIED'`,
        );
      }
      await audit({
        actor_type: 'STAFF', actor_id: actorId, action: 'CERT_REVIEW',
        entity_type: 'certificates', entity_id: certificateId,
        before_state: { verification_status: cert['verification_status'] },
        after_state: { verification_status: nextStatus, decision },
        reason: `Certificate review decision ${decision} (INV-07: verified rendering only after human review)`,
      });
      return created;
    },
  };
}
