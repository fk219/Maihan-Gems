/**
 * packages/db/src/admin/governance-repository.ts
 *
 * Phase 12 - Global Tasks 7, 8 and 9 (Track C4, C5, C6).
 *
 * The data-governance reads and decisions behind the admin console:
 *
 *   - import batches and their staged / conflicted row counts (task 8),
 *   - staging conflicts with BOTH sides, never auto-resolved (task 9),
 *   - the derived-identity queue over the 221 rows and its per-row
 *     approve/reject decisions (task 7, INV-08).
 *
 * Three rules are enforced HERE, not in the UI:
 *
 *   1. A conflict is resolved once. The update carries `resolution IS NULL`
 *      in its WHERE clause and the first read refuses an already-resolved
 *      row, so a second decision cannot overwrite the first.
 *   2. Approval never promotes evidence. `source_sku` is never written and
 *      `sku_evidence_status` is never changed: a derived identity stays
 *      `INFERRED` forever. INV-08 is about the REVIEW decision, not about
 *      inventing an observed identifier (AGENTS.md 6.2-6.3).
 *   3. Rejection never deletes. The row keeps its derived SKU, its DRAFT
 *      state and its attributes; only the review decision is recorded.
 *
 * Where the review decision lives. The locked `products` table has no
 * `review_state` column (0005_catalog_core.sql) and adding one is a schema
 * change this task may not make. The only free-form column on the row is
 * `structured_extra`, so the decision is written there under the documented
 * `derived_identity_review` key with a literal `review_state` member. The
 * read path projects it back as a first-class `review_state` field, which is
 * the field INV-08 names.
 *
 * Every decision writes `audit_logs` with before/after state in the SAME
 * statement as the update (a data-modifying CTE), so a decided row without
 * an audit row is not representable.
 *
 * All values are bound parameters; the only SQL text fragments are fixed
 * column lists and the JSONB path literal.
 */
import { sql, type SQL } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';

export type GovernanceErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT_ALREADY_RESOLVED'
  | 'NOT_A_DERIVED_IDENTITY'
  | 'ALREADY_DECIDED'
  | 'INVALID_DECISION';

export class GovernanceError extends Error {
  constructor(readonly code: GovernanceErrorCode) {
    super(`GOVERNANCE: ${code}`);
    this.name = 'GovernanceError';
  }
}

/** One page of rows plus the UNFILTERED total (honest past the last page). */
export interface PagedRows<T> {
  readonly items: T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export interface PageQuery {
  readonly limit: number;
  readonly offset: number;
}

const MAX_LIMIT = 200;

function pageSize(query: PageQuery): { limit: number; offset: number } {
  const rawLimit = Number.isFinite(query.limit) ? Math.trunc(query.limit) : 50;
  const rawOffset = Number.isFinite(query.offset) ? Math.trunc(query.offset) : 0;
  return {
    limit: Math.min(Math.max(rawLimit, 1), MAX_LIMIT),
    offset: Math.max(rawOffset, 0),
  };
}

// --- Import batches -------------------------------------------------------

export interface ImportBatchRow extends Record<string, unknown> {
  id: string;
  batch_key: string;
  source_system: string;
  source_artifact: string;
  source_sha256: string | null;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  records_seen: number;
  records_accepted: number;
  records_rejected: number;
  records_quarantined: number;
  notes: string | null;
  created_at: string;
  /** Rows loaded into staging_source_pages for this batch. */
  staged_rows: number;
  /** All staging_conflicts recorded for this batch. */
  conflict_rows: number;
  /** Conflicts with resolution IS NULL - the queue an operator must drain. */
  open_conflict_rows: number;
}

interface ImportBatchDbRow extends Record<string, unknown> {
  id: string;
  batch_key: string;
  source_system: string;
  source_artifact: string;
  source_sha256: string | null;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  records_seen: string | null;
  records_accepted: string | null;
  records_rejected: string | null;
  records_quarantined: string | null;
  notes: string | null;
  created_at: string;
  staged_rows: string;
  conflict_rows: string;
  open_conflict_rows: string;
}

function count(value: string | null): number {
  return Number(value ?? '0');
}

export async function listImportBatches(
  db: CatalogDatabase,
  query: PageQuery,
): Promise<PagedRows<ImportBatchRow>> {
  const { limit, offset } = pageSize(query);
  const rows = await db.execute<ImportBatchDbRow>(sql`
    SELECT b.id, b.batch_key, b.source_system, b.source_artifact, b.source_sha256,
           b.status, b.started_at, b.finished_at,
           b.records_seen::text        AS records_seen,
           b.records_accepted::text    AS records_accepted,
           b.records_rejected::text    AS records_rejected,
           b.records_quarantined::text AS records_quarantined,
           b.notes, b.created_at,
           (SELECT count(*) FROM staging_source_pages p
             WHERE p.import_batch_id = b.id)::text AS staged_rows,
           (SELECT count(*) FROM staging_conflicts c
             WHERE c.import_batch_id = b.id)::text AS conflict_rows,
           (SELECT count(*) FROM staging_conflicts c
             WHERE c.import_batch_id = b.id AND c.resolution IS NULL)::text AS open_conflict_rows
      FROM import_batches b
     ORDER BY b.created_at DESC, b.id DESC
     LIMIT ${limit} OFFSET ${offset}
  `);
  const total = await db.execute<{ count: string }>(sql`
    SELECT count(*)::text AS count FROM import_batches
  `);

  return {
    items: rows.rows.map((row) => ({
      ...row,
      records_seen: count(row.records_seen),
      records_accepted: count(row.records_accepted),
      records_rejected: count(row.records_rejected),
      records_quarantined: count(row.records_quarantined),
      staged_rows: count(row.staged_rows),
      conflict_rows: count(row.conflict_rows),
      open_conflict_rows: count(row.open_conflict_rows),
    })),
    total: count(total.rows[0]?.count ?? null),
    limit,
    offset,
  };
}

// --- Staging conflicts ----------------------------------------------------

export interface ConflictRow extends Record<string, unknown> {
  id: string;
  import_batch_id: string;
  batch_key: string | null;
  entity_kind: string;
  entity_ref: string;
  field_name: string;
  value_a: string | null;
  source_url_a: string | null;
  value_b: string | null;
  source_url_b: string | null;
  /** NULL until a human decides; the list NEVER picks a side. */
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

const CONFLICT_COLUMNS = sql`
  c.id, c.import_batch_id, b.batch_key, c.entity_kind, c.entity_ref, c.field_name,
  c.value_a, c.source_url_a, c.value_b, c.source_url_b,
  c.resolution, c.resolved_by, c.resolved_at, c.created_at
`;

export interface ListConflictsQuery extends PageQuery {
  readonly batchId?: string;
  /** true = resolved only, false = unresolved only, undefined = both. */
  readonly resolved?: boolean;
}

export async function listConflicts(
  db: CatalogDatabase,
  query: ListConflictsQuery,
): Promise<PagedRows<ConflictRow>> {
  const { limit, offset } = pageSize(query);
  const conditions: SQL[] = [];
  if (query.batchId !== undefined) {
    conditions.push(sql`c.import_batch_id = ${query.batchId}::uuid`);
  }
  if (query.resolved === true) conditions.push(sql`c.resolution IS NOT NULL`);
  if (query.resolved === false) conditions.push(sql`c.resolution IS NULL`);
  const where = conditions.length === 0 ? sql`` : sql`WHERE ${sql.join(conditions, sql` AND `)}`;

  const rows = await db.execute<ConflictRow>(sql`
    SELECT ${CONFLICT_COLUMNS}
      FROM staging_conflicts c
      LEFT JOIN import_batches b ON b.id = c.import_batch_id
      ${where}
     ORDER BY c.created_at DESC, c.id DESC
     LIMIT ${limit} OFFSET ${offset}
  `);
  const total = await db.execute<{ count: string }>(sql`
    SELECT count(*)::text AS count
      FROM staging_conflicts c
      ${where}
  `);

  return { items: rows.rows, total: count(total.rows[0]?.count ?? null), limit, offset };
}

export interface ResolveConflictInput {
  readonly conflictId: string;
  /** The chosen value. Free text: the human decides, the system never does. */
  readonly resolution: string;
  readonly actorId: string;
  readonly note?: string;
  readonly requestId?: string;
}

export async function resolveConflict(
  db: CatalogDatabase,
  input: ResolveConflictInput,
): Promise<ConflictRow> {
  const resolution = input.resolution.trim();
  if (resolution.length === 0) throw new GovernanceError('INVALID_DECISION');

  // Read first so "already resolved" is a precise refusal, not an empty update.
  const current = await db.execute<ConflictRow>(sql`
    SELECT ${CONFLICT_COLUMNS}
      FROM staging_conflicts c
      LEFT JOIN import_batches b ON b.id = c.import_batch_id
     WHERE c.id = ${input.conflictId}::uuid
  `);
  const before = current.rows[0];
  if (before === undefined) throw new GovernanceError('NOT_FOUND');
  if (before.resolution !== null) throw new GovernanceError('CONFLICT_ALREADY_RESOLVED');

  // The guard repeats `resolution IS NULL`, so even a concurrent decision that
  // lands between the read and the write loses and writes no audit row.
  const updated = await db.execute<ConflictRow>(sql`
    WITH updated AS (
      UPDATE staging_conflicts
         SET resolution = ${resolution},
             resolved_by = ${input.actorId}::uuid,
             resolved_at = now()
       WHERE id = ${input.conflictId}::uuid
         AND resolution IS NULL
      RETURNING id, import_batch_id, entity_kind, entity_ref, field_name,
                value_a, source_url_a, value_b, source_url_b,
                resolution, resolved_by, resolved_at, created_at
    ), logged AS (
      INSERT INTO audit_logs (
        actor_type, actor_id, action, entity_type, entity_id,
        before_state, after_state, request_id, reason
      )
      SELECT 'ADMIN', ${input.actorId}::uuid, 'RESOLVE_CONFLICT', 'staging_conflicts', updated.id,
             jsonb_build_object(
               'resolution', NULL::text,
               'value_a', updated.value_a,
               'source_url_a', updated.source_url_a,
               'value_b', updated.value_b,
               'source_url_b', updated.source_url_b
             ),
             jsonb_build_object('resolution', updated.resolution),
             ${input.requestId ?? null}::text,
             ${input.note ?? null}::text
        FROM updated
      RETURNING id
    )
    SELECT id, import_batch_id, entity_kind, entity_ref, field_name,
           value_a, source_url_a, value_b, source_url_b,
           resolution, resolved_by, resolved_at, created_at
      FROM updated
  `);
  const after = updated.rows[0];
  if (after === undefined) throw new GovernanceError('CONFLICT_ALREADY_RESOLVED');
  return { ...after, batch_key: before.batch_key };
}

// --- Derived identities (the 221) -----------------------------------------

/** The JSONB key that carries the INV-08 review decision. */
export const DERIVED_IDENTITY_REVIEW_KEY = 'derived_identity_review';

export type DerivedIdentityReviewState = 'UNREVIEWED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DerivedIdentityRow extends Record<string, unknown> {
  id: string;
  slug: string;
  title: string;
  source_url: string | null;
  /** Always NULL: a derived identity never becomes an observed SKU. */
  source_sku: null;
  source_sku_derived: string;
  /** Always INFERRED; approval never promotes evidence. */
  sku_evidence_status: string;
  state: string;
  created_at: string;
  review_state: DerivedIdentityReviewState;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

/** The raw projection: the DB column is nullable even though the queue is not. */
interface DerivedIdentityDbRow extends Record<string, unknown> {
  id: string;
  slug: string;
  title: string;
  source_url: string | null;
  source_sku: string | null;
  source_sku_derived: string | null;
  sku_evidence_status: string;
  state: string;
  created_at: string;
  review_state: string | null;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

const REVIEW_STATES: ReadonlySet<string> = new Set([
  'UNREVIEWED',
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

function reviewState(value: string | null): DerivedIdentityReviewState {
  return value !== null && REVIEW_STATES.has(value)
    ? (value as DerivedIdentityReviewState)
    : 'UNREVIEWED';
}

/** Narrow a raw row to the queue's invariant, refusing a non-derived row loudly. */
function toDerivedIdentityRow(row: DerivedIdentityDbRow): DerivedIdentityRow {
  if (row.source_sku !== null || row.source_sku_derived === null) {
    throw new GovernanceError('NOT_A_DERIVED_IDENTITY');
  }
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    source_url: row.source_url,
    source_sku: null,
    source_sku_derived: row.source_sku_derived,
    sku_evidence_status: row.sku_evidence_status,
    state: row.state,
    created_at: row.created_at,
    review_state: reviewState(row.review_state),
    review_note: row.review_note,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
  };
}

/**
 * Projection over the locked products columns plus the JSONB review ledger.
 * The path literal is fixed text, never caller input.
 */
const DERIVED_IDENTITY_COLUMNS = sql`
  p.id, p.slug, p.title, p.source_url, p.source_sku, p.source_sku_derived,
  p.sku_evidence_status, p.state, p.created_at,
  COALESCE(p.structured_extra #>> '{derived_identity_review,review_state}', 'UNREVIEWED')
    AS review_state,
  p.structured_extra #>> '{derived_identity_review,note}'     AS review_note,
  p.structured_extra #>> '{derived_identity_review,actor_id}' AS reviewed_by,
  p.structured_extra #>> '{derived_identity_review,decided_at}' AS reviewed_at
`;

export interface ListDerivedIdentitiesQuery extends PageQuery {
  readonly reviewState?: DerivedIdentityReviewState;
}

export async function listDerivedIdentities(
  db: CatalogDatabase,
  query: ListDerivedIdentitiesQuery,
): Promise<PagedRows<DerivedIdentityRow>> {
  const { limit, offset } = pageSize(query);
  const conditions: SQL[] = [
    sql`p.source_sku IS NULL`,
    sql`p.source_sku_derived IS NOT NULL`,
    sql`p.deleted_at IS NULL`,
  ];
  if (query.reviewState !== undefined) {
    conditions.push(
      query.reviewState === 'UNREVIEWED'
        ? sql`COALESCE(p.structured_extra #>> '{derived_identity_review,review_state}', 'UNREVIEWED') = 'UNREVIEWED'`
        : sql`p.structured_extra #>> '{derived_identity_review,review_state}' = ${query.reviewState}`,
    );
  }
  const where = sql`WHERE ${sql.join(conditions, sql` AND `)}`;

  const rows = await db.execute<DerivedIdentityDbRow>(sql`
    SELECT ${DERIVED_IDENTITY_COLUMNS}
      FROM products p
      ${where}
     ORDER BY p.product_number ASC
     LIMIT ${limit} OFFSET ${offset}
  `);
  const total = await db.execute<{ count: string }>(sql`
    SELECT count(*)::text AS count
      FROM products p
      ${where}
  `);

  return {
    items: rows.rows.map(toDerivedIdentityRow),
    total: count(total.rows[0]?.count ?? null),
    limit,
    offset,
  };
}

interface DecideInput {
  readonly productId: string;
  readonly actorId: string;
  readonly note?: string;
  readonly requestId?: string;
}

async function decideDerivedIdentity(
  db: CatalogDatabase,
  input: DecideInput,
  decision: 'APPROVED' | 'REJECTED',
): Promise<DerivedIdentityRow> {
  const current = await db.execute<DerivedIdentityDbRow>(sql`
    SELECT ${DERIVED_IDENTITY_COLUMNS}
      FROM products p
     WHERE p.id = ${input.productId}::uuid
       AND p.deleted_at IS NULL
     FOR UPDATE OF p
  `);
  const before = current.rows[0];
  if (before === undefined) throw new GovernanceError('NOT_FOUND');
  if (before.source_sku !== null || before.source_sku_derived === null) {
    throw new GovernanceError('NOT_A_DERIVED_IDENTITY');
  }
  const prior = reviewState(before.review_state);
  if (prior !== 'UNREVIEWED') throw new GovernanceError('ALREADY_DECIDED');

  const auditAction = decision === 'APPROVED' ? 'APPROVE_DERIVED_IDENTITY' : 'REJECT_DERIVED_IDENTITY';

  // NOTE what is absent from the SET list: `source_sku`, `sku_evidence_status`
  // and `state`. Approval is a review decision, not an evidence promotion and
  // not a publication; rejection is a flag, never a delete and never an archive.
  const updated = await db.execute<DerivedIdentityDbRow>(sql`
    WITH updated AS (
      UPDATE products AS p
         SET structured_extra = jsonb_set(
               p.structured_extra,
               '{derived_identity_review}',
               jsonb_build_object(
                 'review_state', ${decision}::text,
                 'actor_id', ${input.actorId}::text,
                 'decided_at', now(),
                 'note', ${input.note ?? null}::text
               ),
               true
             ),
             updated_at = now()
       WHERE p.id = ${input.productId}::uuid
         AND p.deleted_at IS NULL
         AND p.source_sku IS NULL
         AND p.source_sku_derived IS NOT NULL
         AND COALESCE(p.structured_extra #>> '{derived_identity_review,review_state}', 'UNREVIEWED') = 'UNREVIEWED'
      RETURNING p.id, p.slug, p.title, p.source_url, p.source_sku, p.source_sku_derived,
                p.sku_evidence_status, p.state, p.created_at, p.structured_extra,
                p.structured_extra #>> '{derived_identity_review,review_state}' AS review_state,
                p.structured_extra #>> '{derived_identity_review,note}'     AS review_note,
                p.structured_extra #>> '{derived_identity_review,actor_id}' AS reviewed_by,
                p.structured_extra #>> '{derived_identity_review,decided_at}' AS reviewed_at
    ), logged AS (
      INSERT INTO audit_logs (
        actor_type, actor_id, action, entity_type, entity_id,
        before_state, after_state, request_id, reason
      )
      SELECT 'ADMIN', ${input.actorId}::uuid, ${auditAction}, 'products', updated.id,
             jsonb_build_object(
               'source_sku', NULL::text,
               'source_sku_derived', updated.source_sku_derived,
               'sku_evidence_status', updated.sku_evidence_status,
               'state', updated.state,
               'review_state', ${prior}::text
             ),
             jsonb_build_object(
               'source_sku', NULL::text,
               'source_sku_derived', updated.source_sku_derived,
               'sku_evidence_status', updated.sku_evidence_status,
               'state', updated.state,
               'review_state', updated.review_state
             ),
             ${input.requestId ?? null}::text,
             ${input.note ?? null}::text
        FROM updated
      RETURNING id
    )
    SELECT ${DERIVED_IDENTITY_COLUMNS}
      FROM updated p
  `);
  const after = updated.rows[0];
  if (after === undefined) throw new GovernanceError('ALREADY_DECIDED');
  return toDerivedIdentityRow(after);
}

export async function approveDerivedIdentity(
  db: CatalogDatabase,
  input: DecideInput,
): Promise<DerivedIdentityRow> {
  return decideDerivedIdentity(db, input, 'APPROVED');
}

export interface RejectDerivedIdentityInput extends DecideInput {
  /** Rejection must say why; an unexplained refusal is not reviewable. */
  readonly reason: string;
}

export async function rejectDerivedIdentity(
  db: CatalogDatabase,
  input: RejectDerivedIdentityInput,
): Promise<DerivedIdentityRow> {
  const reason = input.reason.trim();
  if (reason.length === 0) throw new GovernanceError('INVALID_DECISION');
  return decideDerivedIdentity(db, { ...input, note: reason }, 'REJECTED');
}
