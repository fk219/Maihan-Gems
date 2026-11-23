/**
 * packages/db/src/admin/catalogue-admin-repository.ts
 *
 * Phase 12 — Global Task 6 and 13 (Track C1): catalogue bulk edit with a
 * preview step and a bounded, single-use undo.
 *
 * Authority:
 *   - technical_design/23_ADMIN_CONSOLE_AND_RBAC.md §6 (bulk operations:
 *     preview, approval, one audit row per entity, bounded reversibility),
 *     §7 (preview staleness / concurrent edit), §10 (error codes).
 *   - technical_design/17 state machine is NOT involved here; the only
 *     publication gate this module honours is V15 (price evidence UNKNOWN).
 *   - packages/db/src/catalog/publish.ts is the single-product path; this
 *     module reuses its rules (V15, ARCHIVED is terminal for ACTIVE) rather
 *     than inventing a second set.
 *
 * The safety properties, each enforced HERE and not in the console:
 *
 *   1. BOUNDED BATCH. More than `BULK_MAX_PRODUCTS` ids is refused before any
 *      read, so a request cannot become an unbounded UPDATE.
 *   2. PREVIEW IS THE APPLY. A dry run runs the same read and the same pure
 *      planner as an apply and writes nothing. The console cannot show one
 *      outcome and apply another.
 *   3. NEVER PARTIAL WITHOUT A REPORT. Every requested id gets exactly one
 *      outcome row — CHANGED with before/after, or SKIPPED with a reason.
 *      Rows that would not change are SKIPPED/NO_CHANGE and are not written,
 *      so an operation row only ever describes rows that really moved.
 *   4. EVIDENCE IS NEVER PROMOTED. No statement here writes
 *      `price_evidence`. A price SET on an UNKNOWN-evidence row is refused
 *      per row (`PRICE_EVIDENCE_UNKNOWN`); a bulk publish of such a row is
 *      refused per row (`GATE_V15`), exactly as `publishProduct` refuses it.
 *   5. ONE AUDIT ROW PER CHANGED PRODUCT + ONE OPERATION ROW. The per-product
 *      rows and the `entity_type = 'bulk_operation'` row are written in the
 *      SAME statement as the update (a data-modifying CTE), so a changed row
 *      without its audit trail is not representable.
 *   6. BOUNDED UNDO. The operation row is the undo ledger: it records the
 *      exact before/after snapshot of every changed row. Undo is refused
 *      outside `BULK_UNDO_WINDOW_MINUTES`, refused a second time (the undo
 *      marker is an append-only audit row), and refused when any row no
 *      longer matches the recorded after state (an intervening edit).
 *
 * There is no database connection in this module and no transaction is
 * opened: the caller supplies the executor, as every repository in this
 * package does (technical_design/03).
 *
 * All values are bound parameters; the only SQL text fragments are fixed
 * column lists and enum literals taken from the closed whitelists below.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';

/** Doc 23 §11: "Bulk applies are rate-limited and capped per request". */
export const BULK_MAX_PRODUCTS = 200;

/** Doc 23 §6: "Reversibility | Bounded window". */
export const BULK_UNDO_WINDOW_MINUTES = 30;

export type BulkPriceMode = 'SET' | 'ADJUST_PERCENT';
export type BulkStateTarget = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type BulkAction = 'BULK_PRICE_UPDATE' | 'BULK_STATE_SET';

export type BulkErrorCode =
  | 'TOO_MANY_PRODUCTS'
  | 'EMPTY_SELECTION'
  | 'INVALID_VALUE'
  | 'REASON_REQUIRED'
  | 'NOT_FOUND'
  | 'NOT_A_BULK_OPERATION'
  | 'UNDO_WINDOW_EXPIRED'
  | 'ALREADY_UNDONE'
  | 'ROW_CHANGED_SINCE'
  | 'NOTHING_TO_UNDO';

export class BulkOperationError extends Error {
  constructor(readonly code: BulkErrorCode) {
    super(`BULK_OPERATION: ${code}`);
    this.name = 'BulkOperationError';
  }
}

/** One product as the planner sees it. Prices are the NUMERIC text form. */
export interface BulkTargetProduct extends Record<string, unknown> {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly state: string;
  readonly price_amount: string;
  readonly price_evidence: string;
  readonly published_at: string | null;
}

export type BulkSkipReason =
  | 'NOT_FOUND'
  | 'NO_CHANGE'
  | 'PRICE_EVIDENCE_UNKNOWN'
  | 'GATE_V15'
  | 'INVALID_STATE'
  | 'PRICE_OUT_OF_RANGE';

export interface BulkRowSnapshot {
  readonly priceAmount: string;
  readonly state: string;
  readonly publishedAt: string | null;
}

export interface BulkRowOutcome {
  readonly productId: string;
  readonly slug: string | null;
  readonly title: string | null;
  readonly outcome: 'CHANGED' | 'SKIPPED';
  readonly reason: BulkSkipReason | null;
  readonly before: BulkRowSnapshot | null;
  readonly after: BulkRowSnapshot | null;
  /**
   * True when the apply sets `published_at = now()`. The database clock owns
   * the value, so a planned `after.publishedAt` is null and the applied value
   * is read back from RETURNING.
   */
  readonly publishesNow: boolean;
}

/** The internal write plan: only rows that really change. */
interface PlannedChange {
  readonly productId: string;
  readonly before: BulkRowSnapshot;
  readonly after: BulkRowSnapshot;
  readonly publishesNow: boolean;
}

interface Plan {
  readonly rows: BulkRowOutcome[];
  readonly changes: PlannedChange[];
}

export interface BulkOperationResult {
  /** Null when nothing changed (a dry run, or every row skipped). */
  readonly operationId: string | null;
  readonly action: BulkAction;
  readonly dryRun: boolean;
  readonly requested: number;
  readonly changed: number;
  readonly skipped: number;
  readonly rows: readonly BulkRowOutcome[];
  /** Database-clock expiry of the undo window; null when nothing was written. */
  readonly undoExpiresAt: string | null;
}

// --- Numeric handling -----------------------------------------------------

/** NUMERIC(12,2): the largest price the column accepts. */
const MAX_PRICE_CENTS = 999_999_999_999n; // 9,999,999,999.99

/** Parse the NUMERIC text form into integer cents without float drift. */
export function priceToCents(amount: string): bigint {
  const trimmed = amount.trim();
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole = '0', fraction = ''] = unsigned.split('.');
  const cents = BigInt(`${whole}${(fraction + '00').slice(0, 2)}` || '0');
  return negative ? -cents : cents;
}

export function centsToPrice(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  return `${negative ? '-' : ''}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`;
}

/** 1 basis point = 0.01%. Keeps a percent such as 12.5 exact. */
function percentToBasisPoints(percent: number): bigint {
  return BigInt(Math.round(percent * 100));
}

/** Half-up (away from zero) rounding, so the preview and the apply agree. */
function applyBasisPoints(cents: bigint, basisPoints: bigint): bigint {
  const denominator = 10_000n;
  const numerator = cents * (denominator + basisPoints);
  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  const rounded = (absolute + denominator / 2n) / denominator;
  return negative ? -rounded : rounded;
}

// --- Pure planners (shared by the preview and the apply) ------------------

function skip(
  row: BulkTargetProduct,
  reason: BulkSkipReason,
): BulkRowOutcome {
  return {
    productId: row.id,
    slug: row.slug,
    title: row.title,
    outcome: 'SKIPPED',
    reason,
    before: {
      priceAmount: row.price_amount,
      state: row.state,
      publishedAt: row.published_at,
    },
    after: null,
    publishesNow: false,
  };
}

function notFound(productId: string): BulkRowOutcome {
  return {
    productId,
    slug: null,
    title: null,
    outcome: 'SKIPPED',
    reason: 'NOT_FOUND',
    before: null,
    after: null,
    publishesNow: false,
  };
}

/**
 * Price planning. A SET is refused on an UNKNOWN-evidence row: writing an
 * explicit price over a row whose price evidence is UNKNOWN would manufacture
 * a commercial fact the evidence does not support (AGENTS.md §6.1, §7).
 * ADJUST_PERCENT is arithmetic on an existing number and is allowed, but it
 * never changes `price_evidence` either.
 */
export function planPriceUpdate(
  targets: readonly BulkTargetProduct[],
  mode: BulkPriceMode,
  value: number,
): Plan {
  const rows: BulkRowOutcome[] = [];
  const changes: PlannedChange[] = [];

  for (const row of targets) {
    const before: BulkRowSnapshot = {
      priceAmount: row.price_amount,
      state: row.state,
      publishedAt: row.published_at,
    };

    if (mode === 'SET' && row.price_evidence === 'UNKNOWN') {
      rows.push(skip(row, 'PRICE_EVIDENCE_UNKNOWN'));
      continue;
    }

    const currentCents = priceToCents(row.price_amount);
    const nextCents =
      mode === 'SET'
        ? priceToCents(value.toFixed(2))
        : applyBasisPoints(currentCents, percentToBasisPoints(value));

    if (nextCents < 0n || nextCents > MAX_PRICE_CENTS) {
      rows.push(skip(row, 'PRICE_OUT_OF_RANGE'));
      continue;
    }

    const nextPrice = centsToPrice(nextCents);
    if (nextPrice === row.price_amount) {
      rows.push(skip(row, 'NO_CHANGE'));
      continue;
    }

    const after: BulkRowSnapshot = {
      priceAmount: nextPrice,
      state: row.state,
      publishedAt: row.published_at,
    };
    rows.push({
      productId: row.id,
      slug: row.slug,
      title: row.title,
      outcome: 'CHANGED',
      reason: null,
      before,
      after,
      publishesNow: false,
    });
    changes.push({ productId: row.id, before, after, publishesNow: false });
  }

  return { rows, changes };
}

/**
 * State planning. Publishing still honours gate V15 and the terminal ARCHIVED
 * rule from `publish.ts`: a bulk publish cannot do what a single publish
 * refuses.
 */
export function planStateSet(
  targets: readonly BulkTargetProduct[],
  to: BulkStateTarget,
): Plan {
  const rows: BulkRowOutcome[] = [];
  const changes: PlannedChange[] = [];

  for (const row of targets) {
    const before: BulkRowSnapshot = {
      priceAmount: row.price_amount,
      state: row.state,
      publishedAt: row.published_at,
    };

    if (row.state === to) {
      rows.push(skip(row, 'NO_CHANGE'));
      continue;
    }
    if (to === 'ACTIVE' && row.state === 'ARCHIVED') {
      rows.push(skip(row, 'INVALID_STATE'));
      continue;
    }
    if (to === 'ACTIVE' && row.price_evidence === 'UNKNOWN') {
      rows.push(skip(row, 'GATE_V15'));
      continue;
    }

    const publishesNow = to === 'ACTIVE';
    // `published_at` is now() for a publish and NULL otherwise, exactly as
    // `publishProduct`/`unpublishProduct` write it. The database clock owns the
    // publish value, so the planned snapshot carries null and `publishesNow`
    // tells the reader why.
    const after: BulkRowSnapshot = {
      priceAmount: row.price_amount,
      state: to,
      publishedAt: null,
    };
    rows.push({
      productId: row.id,
      slug: row.slug,
      title: row.title,
      outcome: 'CHANGED',
      reason: null,
      before,
      after,
      publishesNow,
    });
    changes.push({ productId: row.id, before, after, publishesNow });
  }

  return { rows, changes };
}

// --- Input validation -----------------------------------------------------

function normaliseIds(productIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of productIds) {
    const id = raw.trim();
    if (id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function requireSelection(productIds: readonly string[]): string[] {
  const ids = normaliseIds(productIds);
  if (ids.length === 0) throw new BulkOperationError('EMPTY_SELECTION');
  if (ids.length > BULK_MAX_PRODUCTS) throw new BulkOperationError('TOO_MANY_PRODUCTS');
  return ids;
}

function requireReason(reason: string): string {
  const trimmed = reason.trim();
  if (trimmed.length === 0) throw new BulkOperationError('REASON_REQUIRED');
  return trimmed;
}

function requirePriceValue(mode: BulkPriceMode, value: number): void {
  if (!Number.isFinite(value)) throw new BulkOperationError('INVALID_VALUE');
  if (mode === 'SET') {
    if (value < 0 || value > 9_999_999_999.99) throw new BulkOperationError('INVALID_VALUE');
    return;
  }
  // A percentage cannot remove the whole price, and the cap bounds blast radius.
  if (value <= -100 || value > 1000) throw new BulkOperationError('INVALID_VALUE');
}

// --- Reads ----------------------------------------------------------------

/**
 * pg returns TIMESTAMPTZ as a JS `Date`; the report and the op JSON must carry
 * an ISO-8601 string either way, so the value is normalised once here (a fake
 * executor that returns a string passes through unchanged).
 */
function isoString(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function isoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return isoString(value);
}

const TARGET_COLUMNS = sql`
  p.id, p.slug, p.title,
  p.state::text AS state,
  p.price_amount::text AS price_amount,
  p.price_evidence::text AS price_evidence,
  p.published_at
`;

interface RawTargetRow extends Record<string, unknown> {
  id: string;
  slug: string;
  title: string;
  state: string;
  price_amount: string;
  price_evidence: string;
  published_at: unknown;
}

async function readTargets(
  db: CatalogDatabase,
  ids: readonly string[],
): Promise<BulkTargetProduct[]> {
  const result = await db.execute<RawTargetRow>(sql`
    SELECT ${TARGET_COLUMNS}
      FROM products p
     WHERE p.id = ANY(${ids}::uuid[])
       AND p.deleted_at IS NULL
  `);
  return result.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    state: row.state,
    price_amount: row.price_amount,
    price_evidence: row.price_evidence,
    published_at: isoOrNull(row.published_at),
  }));
}

/** Keep the caller's order and turn every missing id into a NOT_FOUND row. */
function alignRows(ids: readonly string[], plan: Plan): BulkRowOutcome[] {
  const byId = new Map(plan.rows.map((row) => [row.productId, row]));
  return ids.map((id) => byId.get(id) ?? notFound(id));
}

// --- Apply ----------------------------------------------------------------

interface WriteResultRow extends Record<string, unknown> {
  operation_id: string;
  created_at: string;
  undo_expires_at: string;
}

function targetsJson(changes: readonly PlannedChange[]): string {
  return JSON.stringify(
    changes.map((change) => ({
      product_id: change.productId,
      before_price: change.before.priceAmount,
      after_price: change.after.priceAmount,
      before_state: change.before.state,
      after_state: change.after.state,
      before_published_at: change.before.publishedAt,
      after_published_at: change.after.publishedAt,
      publish_now: change.publishesNow,
    })),
  );
}

/**
 * The single write statement. The update, the per-product audit rows and the
 * `bulk_operation` row commit together or not at all; the operation row is
 * built from RETURNING, so its snapshot is what the database actually wrote,
 * not what the caller hoped it would write.
 */
async function writeOperation(
  db: CatalogDatabase,
  params: {
    readonly action: BulkAction;
    readonly actorId: string;
    readonly reason: string;
    readonly requestId?: string;
    readonly before: Record<string, unknown>;
    readonly changes: readonly PlannedChange[];
  },
): Promise<{ operationId: string; undoExpiresAt: string }> {
  const result = await db.execute<WriteResultRow>(sql`
    WITH target AS (
      SELECT *
        FROM jsonb_to_recordset(${targetsJson(params.changes)}::jsonb) AS t(
          product_id uuid,
          before_price text,
          after_price text,
          before_state text,
          after_state text,
          before_published_at text,
          after_published_at text,
          publish_now boolean
        )
    ), updated AS (
      UPDATE products p
         SET price_amount = t.after_price::numeric(12, 2),
             state = t.after_state::product_state,
             published_at = CASE
               WHEN t.publish_now THEN now()
               ELSE t.after_published_at::timestamptz
             END,
             updated_at = now()
        FROM target t
       WHERE p.id = t.product_id
         AND p.deleted_at IS NULL
      RETURNING p.id, p.slug, p.price_amount, p.state, p.published_at, p.price_evidence
    ), row_logs AS (
      INSERT INTO audit_logs (
        actor_type, actor_id, action, entity_type, entity_id,
        before_state, after_state, request_id, reason
      )
      SELECT 'ADMIN', ${params.actorId}::uuid, ${params.action}, 'products', u.id,
             jsonb_build_object(
               'price_amount', t.before_price,
               'state', t.before_state,
               'published_at', t.before_published_at
             ),
             jsonb_build_object(
               'price_amount', u.price_amount::text,
               'state', u.state::text,
               'published_at', u.published_at,
               'price_evidence', u.price_evidence::text
             ),
             ${params.requestId ?? null}::text,
             ${params.reason}::text
        FROM updated u
        JOIN target t ON t.product_id = u.id
      RETURNING id
    ), op AS (
      INSERT INTO audit_logs (
        actor_type, actor_id, action, entity_type, entity_id,
        before_state, after_state, request_id, reason
      )
      VALUES (
        'ADMIN', ${params.actorId}::uuid, ${params.action}, 'bulk_operation', gen_random_uuid(),
        ${JSON.stringify(params.before)}::jsonb,
        jsonb_build_object(
          'action', ${params.action}::text,
          'changed_rows', (SELECT count(*) FROM updated),
          'audited_rows', (SELECT count(*) FROM row_logs),
          'rows', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'product_id', u.id,
              'slug', u.slug,
              'before', jsonb_build_object(
                'price_amount', t.before_price,
                'state', t.before_state,
                'published_at', t.before_published_at
              ),
              'after', jsonb_build_object(
                'price_amount', u.price_amount::text,
                'state', u.state::text,
                'published_at', u.published_at
              )
            ))
            FROM updated u
            JOIN target t ON t.product_id = u.id
          ), '[]'::jsonb)
        ),
        ${params.requestId ?? null}::text,
        ${params.reason}::text
      )
      RETURNING entity_id, created_at, created_at + interval '${sql.raw(String(BULK_UNDO_WINDOW_MINUTES))} minutes' AS undo_expires_at
    )
    SELECT o.entity_id AS operation_id,
           o.created_at,
           o.undo_expires_at
      FROM op o
  `);

  const row = result.rows[0];
  if (row === undefined) throw new BulkOperationError('NOT_FOUND');
  return {
    operationId: row.operation_id,
    undoExpiresAt: isoString(row.undo_expires_at),
  };
}

function buildResult(params: {
  readonly action: BulkAction;
  readonly dryRun: boolean;
  readonly ids: readonly string[];
  readonly rows: readonly BulkRowOutcome[];
  readonly operationId: string | null;
  readonly undoExpiresAt: string | null;
}): BulkOperationResult {
  const changed = params.rows.filter((row) => row.outcome === 'CHANGED').length;
  return {
    operationId: params.operationId,
    action: params.action,
    dryRun: params.dryRun,
    requested: params.ids.length,
    changed,
    skipped: params.rows.length - changed,
    rows: params.rows,
    undoExpiresAt: params.undoExpiresAt,
  };
}

// --- Public API -----------------------------------------------------------

export interface BulkPriceInput {
  readonly productIds: readonly string[];
  readonly mode: BulkPriceMode;
  readonly value: number;
  readonly actorId: string;
  readonly reason: string;
  /** true = preview only; the repository issues one SELECT and no writes. */
  readonly dryRun?: boolean;
  readonly requestId?: string;
}

export async function bulkUpdatePrices(
  db: CatalogDatabase,
  input: BulkPriceInput,
): Promise<BulkOperationResult> {
  const ids = requireSelection(input.productIds);
  const reason = requireReason(input.reason);
  requirePriceValue(input.mode, input.value);

  const targets = await readTargets(db, ids);
  const plan = planPriceUpdate(targets, input.mode, input.value);
  const rows = alignRows(ids, plan);
  const dryRun = input.dryRun === true;

  if (dryRun || plan.changes.length === 0) {
    return buildResult({
      action: 'BULK_PRICE_UPDATE',
      dryRun,
      ids,
      rows,
      operationId: null,
      undoExpiresAt: null,
    });
  }

  const written = await writeOperation(db, {
    action: 'BULK_PRICE_UPDATE',
    actorId: input.actorId,
    reason,
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    before: {
      mode: input.mode,
      value: input.value,
      requested_ids: ids,
      changed_rows: plan.changes.length,
    },
    changes: plan.changes,
  });

  return buildResult({
    action: 'BULK_PRICE_UPDATE',
    dryRun: false,
    ids,
    rows,
    operationId: written.operationId,
    undoExpiresAt: written.undoExpiresAt,
  });
}

export interface BulkStateInput {
  readonly productIds: readonly string[];
  readonly to: BulkStateTarget;
  readonly actorId: string;
  readonly reason: string;
  readonly dryRun?: boolean;
  readonly requestId?: string;
}

export async function bulkSetState(
  db: CatalogDatabase,
  input: BulkStateInput,
): Promise<BulkOperationResult> {
  const ids = requireSelection(input.productIds);
  const reason = requireReason(input.reason);

  const targets = await readTargets(db, ids);
  const plan = planStateSet(targets, input.to);
  const rows = alignRows(ids, plan);
  const dryRun = input.dryRun === true;

  if (dryRun || plan.changes.length === 0) {
    return buildResult({
      action: 'BULK_STATE_SET',
      dryRun,
      ids,
      rows,
      operationId: null,
      undoExpiresAt: null,
    });
  }

  const written = await writeOperation(db, {
    action: 'BULK_STATE_SET',
    actorId: input.actorId,
    reason,
    ...(input.requestId === undefined ? {} : { requestId: input.requestId }),
    before: {
      to: input.to,
      requested_ids: ids,
      changed_rows: plan.changes.length,
    },
    changes: plan.changes,
  });

  return buildResult({
    action: 'BULK_STATE_SET',
    dryRun: false,
    ids,
    rows,
    operationId: written.operationId,
    undoExpiresAt: written.undoExpiresAt,
  });
}

// --- Undo -----------------------------------------------------------------

/** One recent bulk operation as the console's undo list sees it. */
export interface RecentBulkOperationRow extends Record<string, unknown> {
  readonly operation_id: string;
  readonly action: string;
  readonly created_at: string;
  readonly changed_rows: number;
  readonly undo_expires_at: string;
  readonly within_window: boolean;
  readonly already_undone: boolean;
}

interface RecentBulkOperationDbRow extends Record<string, unknown> {
  operation_id: string;
  action: string;
  created_at: unknown;
  changed_rows: unknown;
  undo_expires_at: unknown;
  within_window: boolean;
  already_undone: boolean;
}

/**
 * The undo affordance after a reload. This is a read of the append-only audit
 * ledger, not a second operation store: the `bulk_operation` rows ARE the
 * record, and the two flags are computed from the database clock and the undo
 * marker so the console cannot offer an undo the repository would refuse.
 */
export async function listRecentBulkOperations(
  db: CatalogDatabase,
  options: { readonly limit?: number } = {},
): Promise<RecentBulkOperationRow[]> {
  const rawLimit = options.limit ?? 10;
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 10, 1), 50);

  const rows = await db.execute<RecentBulkOperationDbRow>(sql`
    SELECT o.entity_id AS operation_id,
           o.action,
           o.created_at,
           (o.after_state->>'changed_rows')::int AS changed_rows,
           o.created_at + interval '${sql.raw(String(BULK_UNDO_WINDOW_MINUTES))} minutes' AS undo_expires_at,
           (o.created_at >= now() - interval '${sql.raw(String(BULK_UNDO_WINDOW_MINUTES))} minutes') AS within_window,
           EXISTS (
             SELECT 1
               FROM audit_logs x
              WHERE x.entity_type = 'bulk_operation'
                AND x.entity_id = o.entity_id
                AND x.action = 'UNDO_BULK_OPERATION'
           ) AS already_undone
      FROM audit_logs o
     WHERE o.entity_type = 'bulk_operation'
       AND o.action IN ('BULK_PRICE_UPDATE', 'BULK_STATE_SET')
     ORDER BY o.id DESC
     LIMIT ${limit}
  `);

  return rows.rows.map((row) => ({
    operation_id: row.operation_id,
    action: row.action,
    created_at: isoString(row.created_at),
    changed_rows: Number(row.changed_rows ?? 0),
    undo_expires_at: isoString(row.undo_expires_at),
    within_window: row.within_window,
    already_undone: row.already_undone,
  }));
}

interface OperationRow extends Record<string, unknown> {
  operation_id: string;
  action: string;
  after_state: {
    readonly rows?: ReadonlyArray<{
      readonly product_id: string;
      readonly before?: {
        readonly price_amount?: string;
        readonly state?: string;
        readonly published_at?: string | null;
      };
      readonly after?: {
        readonly price_amount?: string;
        readonly state?: string;
        readonly published_at?: string | null;
      };
    }>;
  } | null;
  created_at: string;
  within_window: boolean;
  already_undone: boolean;
}

export interface BulkUndoInput {
  readonly operationId: string;
  readonly actorId: string;
  readonly reason?: string;
  readonly requestId?: string;
}

export interface BulkUndoResult {
  readonly operationId: string;
  readonly action: string;
  readonly reversed: number;
  readonly rows: ReadonlyArray<{
    readonly productId: string;
    readonly slug: string;
    readonly priceAmount: string;
    readonly state: string;
  }>;
}

interface UndoWriteRow extends Record<string, unknown> {
  product_id: string;
  slug: string;
  price_amount: string;
  state: string;
}

interface UndoTarget {
  readonly product_id: string;
  readonly before_price: string;
  readonly after_price: string;
  readonly before_state: string;
  readonly after_state: string;
  readonly before_published_at: string | null;
}

function undoReason(reason: string | undefined): string {
  const trimmed = (reason ?? '').trim();
  return trimmed.length === 0 ? 'Bulk operation reversed within the undo window' : trimmed;
}

/**
 * Reverse exactly the rows the operation changed.
 *
 * Refusal order is deliberate: single-use first (the strongest statement),
 * then the window, then the data. A second undo is a 409 no matter how young
 * the operation is.
 */
export async function undoBulkOperation(
  db: CatalogDatabase,
  input: BulkUndoInput,
): Promise<BulkUndoResult> {
  const current = await db.execute<OperationRow>(sql`
    SELECT o.entity_id AS operation_id,
           o.action,
           o.after_state,
           o.created_at,
           (o.created_at >= now() - interval '${sql.raw(String(BULK_UNDO_WINDOW_MINUTES))} minutes') AS within_window,
           EXISTS (
             SELECT 1
               FROM audit_logs x
              WHERE x.entity_type = 'bulk_operation'
                AND x.entity_id = o.entity_id
                AND x.action = 'UNDO_BULK_OPERATION'
           ) AS already_undone
      FROM audit_logs o
     WHERE o.entity_type = 'bulk_operation'
       AND o.entity_id = ${input.operationId}::uuid
       AND o.action IN ('BULK_PRICE_UPDATE', 'BULK_STATE_SET')
     ORDER BY o.id DESC
     LIMIT 1
  `);

  const operation = current.rows[0];
  if (operation === undefined) throw new BulkOperationError('NOT_FOUND');
  if (operation.already_undone) throw new BulkOperationError('ALREADY_UNDONE');
  if (!operation.within_window) throw new BulkOperationError('UNDO_WINDOW_EXPIRED');

  const recorded = operation.after_state?.rows ?? [];
  const targets: UndoTarget[] = [];
  for (const row of recorded) {
    const before = row.before;
    const after = row.after;
    if (
      before?.price_amount === undefined ||
      before.state === undefined ||
      after?.price_amount === undefined ||
      after.state === undefined
    ) {
      continue;
    }
    targets.push({
      product_id: row.product_id,
      before_price: before.price_amount,
      after_price: after.price_amount,
      before_state: before.state,
      after_state: after.state,
      before_published_at: before.published_at ?? null,
    });
  }

  if (targets.length === 0) throw new BulkOperationError('NOTHING_TO_UNDO');

  // One statement: the reversal, one audit row per reversed product and the
  // append-only undo marker. `gate` makes it all-or-nothing — if any row no
  // longer matches the recorded after state, nothing is reversed and no
  // marker is written.
  const reversed = await db.execute<UndoWriteRow>(sql`
    WITH target AS (
      SELECT *
        FROM jsonb_to_recordset(${JSON.stringify(targets)}::jsonb) AS t(
          product_id uuid,
          before_price text,
          after_price text,
          before_state text,
          after_state text,
          before_published_at text
        )
    ), gate AS (
      SELECT
        (SELECT count(*) FROM target)::int AS expected,
        (SELECT count(*)
           FROM target t
           JOIN products p ON p.id = t.product_id
          WHERE p.deleted_at IS NULL
            AND p.price_amount::text = t.after_price
            AND p.state::text = t.after_state)::int AS matching,
        (SELECT count(*)
           FROM audit_logs x
          WHERE x.entity_type = 'bulk_operation'
            AND x.entity_id = ${input.operationId}::uuid
            AND x.action = 'UNDO_BULK_OPERATION')::int AS prior_undos
    ), ready AS (
      SELECT 1 AS ok
        FROM gate
       WHERE expected > 0
         AND expected = matching
         AND prior_undos = 0
    ), updated AS (
      UPDATE products p
         SET price_amount = t.before_price::numeric(12, 2),
             state = t.before_state::product_state,
             published_at = t.before_published_at::timestamptz,
             updated_at = now()
        FROM target t
       WHERE p.id = t.product_id
         AND p.deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM ready)
      RETURNING p.id, p.slug, p.price_amount, p.state
    ), row_logs AS (
      INSERT INTO audit_logs (
        actor_type, actor_id, action, entity_type, entity_id,
        before_state, after_state, request_id, reason
      )
      SELECT 'ADMIN', ${input.actorId}::uuid, 'UNDO_BULK_OPERATION_ROW', 'products', u.id,
             jsonb_build_object(
               'price_amount', t.after_price,
               'state', t.after_state
             ),
             jsonb_build_object(
               'price_amount', u.price_amount::text,
               'state', u.state::text
             ),
             ${input.requestId ?? null}::text,
             ${undoReason(input.reason)}::text
        FROM updated u
        JOIN target t ON t.product_id = u.id
      RETURNING id
    ), marker AS (
      INSERT INTO audit_logs (
        actor_type, actor_id, action, entity_type, entity_id,
        before_state, after_state, request_id, reason
      )
      SELECT 'ADMIN', ${input.actorId}::uuid, 'UNDO_BULK_OPERATION', 'bulk_operation',
             ${input.operationId}::uuid,
             jsonb_build_object('reversed_rows', (SELECT count(*) FROM updated)),
             jsonb_build_object(
               'operation_id', ${input.operationId}::text,
               'reversed_rows', (SELECT count(*) FROM updated),
               'audited_rows', (SELECT count(*) FROM row_logs)
             ),
             ${input.requestId ?? null}::text,
             ${undoReason(input.reason)}::text
        FROM ready
      RETURNING id
    )
    SELECT u.id AS product_id,
           u.slug,
           u.price_amount::text AS price_amount,
           u.state::text AS state
      FROM updated u
  `);

  if (reversed.rows.length === 0) throw new BulkOperationError('ROW_CHANGED_SINCE');

  return {
    operationId: input.operationId,
    action: operation.action,
    reversed: reversed.rows.length,
    rows: reversed.rows.map((row) => ({
      productId: row.product_id,
      slug: row.slug,
      priceAmount: row.price_amount,
      state: row.state,
    })),
  };
}
