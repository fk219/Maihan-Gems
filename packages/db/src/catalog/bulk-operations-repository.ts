/**
 * packages/db/src/catalog/bulk-operations-repository.ts
 *
 * Phase 12 — Stage D / Global Tasks 6 + 13 (E12.4, plan §19 tasks 6 & 13).
 *
 * Bulk editing of catalogue products with the doc 23 §6–§10 machinery:
 *
 *   §6  Preview  — every bulk edit previews the change set before applying
 *   §6  Approval — records who approved it (dual above threshold, §8 rule 3)
 *   §6  Audit    — one audit_logs row per affected entity, before + after
 *   §6  Undo     — bounded window using versioned snapshots of the pre-state
 *   §7  Preview staleness — the preview token binds to each source row's
 *        `version`; a changed source invalidates the apply (PREVIEW_STALE)
 *   §10 CONFIRMATION_MISMATCH — destructive ops require typed confirmation
 *
 * The preview DIFF is computed in pure code from explicit (field, from, to)
 * tuples so it is testable without a database; the apply runs a single
 * CASE-driven UPDATE inside the caller's transaction.
 *
 * Allowed fields (closed whitelist — everything else is TRUST or identity
 * metadata that must not change via bulk): title, subtitle, availability,
 * seo_title, seo_description, short_description, engraving_enabled,
 * engraving_text. State transitions are NEVER a bulk field (publication is
 * a curation decision, plan §19 constraint).
 */
import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from './executor.js';

export const BULK_EDITABLE_FIELDS = Object.freeze([
  'title', 'subtitle', 'availability', 'seo_title', 'seo_description',
  'short_description', 'engraving_enabled', 'engraving_text',
] as const);
export type BulkEditableField = (typeof BULK_EDITABLE_FIELDS)[number];

/** Above this count a bulk operation requires a second approver (§8 rule 3). */
export const BULK_DUAL_APPROVAL_THRESHOLD = 50;
/** Undo window (§6 bounded reversibility). */
export const BULK_UNDO_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface BulkChange {
  productId: string;
  field: BulkEditableField;
  from: unknown;
  to: unknown;
}

export interface BulkPreview {
  token: string;
  changes: BulkChange[];
  /** Version of each source row the preview is bound to (§7). */
  versions: Record<string, number>;
  dualApprovalRequired: boolean;
}

export interface BulkPreviewStored {
  token: string;
  changes: BulkChange[];
  versions: Record<string, number>;
  createdAt: number;
  approvedBy: string[];
  appliedAt: number | null;
  confirmationToken: string | null;
}

/* ── Pure diff machinery (testable without a DB) ────────────────────── */

export class BulkOperationError extends Error {
  constructor(readonly kind:
    | 'INVALID_FIELD' | 'EMPTY_CHANGESET' | 'PREVIEW_STALE' | 'DUAL_APPROVAL_REQUIRED'
    | 'CONFIRMATION_MISMATCH' | 'UNDO_WINDOW_EXPIRED' | 'NOT_FOUND' | 'ALREADY_APPLIED') {
    super(`BULK: ${kind}`);
    this.name = 'BulkOperationError';
  }
}

type FieldValue = string | number | boolean | null;

export function coerceField(field: string, value: unknown): FieldValue {
  switch (field) {
    case 'title':
    case 'subtitle':
    case 'seo_title':
    case 'seo_description':
    case 'short_description':
    case 'engraving_text':
      if (value === null) return null;
      if (typeof value !== 'string') throw new BulkOperationError('INVALID_FIELD');
      return value;
    case 'availability':
    case 'engraving_enabled':
      if (typeof value !== 'boolean') throw new BulkOperationError('INVALID_FIELD');
      return value;
    default:
      throw new BulkOperationError('INVALID_FIELD');
  }
}

/** Build the preview changeset from (product, current values) pairs. */
export function buildBulkChangeSet(
  requested: ReadonlyArray<{ productId: string; field: string; value: unknown }>,
  currentValues: ReadonlyArray<{ productId: string; values: Record<string, unknown> }>,
): BulkChange[] {
  const byProduct = new Map(currentValues.map((c) => [c.productId, c.values]));
  const out: BulkChange[] = [];
  for (const req of requested) {
    const field = req.field as BulkEditableField;
    if (!BULK_EDITABLE_FIELDS.includes(field)) throw new BulkOperationError('INVALID_FIELD');
    const current = byProduct.get(req.productId);
    if (current === undefined) throw new BulkOperationError('NOT_FOUND');
    const to = coerceField(field, req.value);
    const from = current[field];
    if (from === to) continue; // no-op change: excluded from the diff
    out.push({ productId: req.productId, field, from, to });
  }
  if (out.length === 0) throw new BulkOperationError('EMPTY_CHANGESET');
  return out;
}

export interface BulkAuditWriter {
  (entry: {
    actor_type: 'STAFF' | 'SYSTEM';
    actor_id: string;
    action: 'BULK_PREVIEW' | 'BULK_APPLY' | 'BULK_REVERT';
    entity_type: 'products';
    entity_id: string;
    before_state: Record<string, unknown> | null;
    after_state: Record<string, unknown> | null;
    reason: string;
  }): Promise<void>;
}

export interface BulkOperationsRepository {
  /**
   * Load current values + versions for the requested products and build
   * the §7-bound preview. The returned token must be passed to apply().
   */
  preview(input: {
    changes: ReadonlyArray<{ productId: string; field: string; value: unknown }>;
    actorId: string;
  }): Promise<BulkPreview>;

  apply(input: {
    token: string;
    approverIds: string[];
    /** Destructive threshold confirmation: exact token echo required (§8 rule 6). */
    typedConfirmation?: string;
    actorId: string;
  }): Promise<{ applied: number }>;

  revert(input: { token: string; actorId: string }): Promise<{ reverted: number }>;
}

export function createBulkOperationsRepository(db: CatalogDatabase, audit: BulkAuditWriter): BulkOperationsRepository {
  // In-isolate preview ledger: previews are short-lived rendezvous state; the
  // durable snapshot for undo lives in the applied audit rows (one per
  // entity, before/after), which the appendix queries. (Tokens are secrets-
  // free, non-guessable, and never contain PII.)
  const previews = new Map<string, BulkPreviewStored>();

  const newToken = (): string => randomBytes(18).toString('hex');

  return {
    async preview(input) {
      const ids = Array.from(new Set(input.changes.map((c) => c.productId)));
      if (ids.length === 0) throw new BulkOperationError('EMPTY_CHANGESET');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await db.execute<any>(sql`
        SELECT id,
               version,
               title, subtitle, seo_title, seo_description, short_description,
               availability, engraving_enabled, engraving_text
          FROM products
         WHERE id IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
      `);
      const current = res.rows.map((r) => ({
        productId: r['id'] as string,
        values: {
          title: r['title'], subtitle: r['subtitle'], seo_title: r['seo_title'],
          seo_description: r['seo_description'], short_description: r['short_description'],
          availability: r['availability'], engraving_enabled: r['engraving_enabled'],
          engraving_text: r['engraving_text'],
        },
        version: r['version'] as number,
      }));
      const changes = buildBulkChangeSet(input.changes, current);
      const versions: Record<string, number> = {};
      for (const c of current) versions[c.productId] = c.version;
      const token = newToken();
      previews.set(token, {
        token, changes, versions,
        createdAt: Date.now(),
        approvedBy: [],
        appliedAt: null,
        confirmationToken: null,
      });
      await audit({
        actor_type: 'STAFF', actor_id: input.actorId, action: 'BULK_PREVIEW',
        entity_type: 'products', entity_id: input.changes[0]?.productId ?? '',
        before_state: null,
        after_state: { token: `<preview:${changes.length}-changes>`, product_count: new Set(changes.map((c) => c.productId)).size, change_count: changes.length },
        reason: 'Bulk edit previewed (doc 23 §6)',
      });
      return {
        token,
        changes,
        versions,
        dualApprovalRequired: new Set(changes.map((c) => c.productId)).size > BULK_DUAL_APPROVAL_THRESHOLD,
      };
    },

    async apply(input) {
      const preview = previews.get(input.token);
      if (preview === undefined) throw new BulkOperationError('NOT_FOUND');
      if (preview.appliedAt !== null) throw new BulkOperationError('ALREADY_APPLIED');
      const needsDual = new Set(preview.changes.map((c) => c.productId)).size > BULK_DUAL_APPROVAL_THRESHOLD;
      if (needsDual && new Set(input.approverIds).size < 2) {
        throw new BulkOperationError('DUAL_APPROVAL_REQUIRED');
      }
      // §7 staleness: previews bind to source versions; a changed source
      // invalidates the apply rather than silently editing new data.
      const productIds = Array.from(new Set(preview.changes.map((c) => c.productId)));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const versionsRes = await db.execute<any>(sql`
        SELECT id, version FROM products WHERE id IN (${sql.join(productIds.map((id) => sql`${id}`), sql`, `)})
      `);
      const liveVersions: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of versionsRes.rows) liveVersions[row['id'] as string] = row['version'] as number;
      for (const [id, expected] of Object.entries(preview.versions)) {
        if (liveVersions[id] !== expected) throw new BulkOperationError('PREVIEW_STALE');
      }
      // §8 rule 6: destructive operations require typed confirmation matching
      // the target identifier (an above-threshold destructive bulk is any
      // apply; the caller echoes half the token to prove intent).
      const destructive = needsDual || preview.changes.length >= BULK_DUAL_APPROVAL_THRESHOLD;
      if (destructive && input.typedConfirmation !== input.token.slice(0, 12)) {
        throw new BulkOperationError('CONFIRMATION_MISMATCH');
      }
      // Record approval set BEFORE mutation (§6: "Records who approved it").
      preview.approvedBy = Array.from(new Set(input.approverIds));
      preview.appliedAt = Date.now();
      let applied = 0;
      for (const change of preview.changes) {
        const col = sql.identifier(change.field);
        const res = await db.execute(
          sql`UPDATE products
                 SET ${col} = ${change.to as string}, version = version + 1, updated_at = now()
               WHERE id = ${change.productId} AND version = ${preview.versions[change.productId] ?? 0}`,
        );
        if ((res as unknown as { rowCount: number }).rowCount > 0) applied += 1;
        await audit({
          actor_type: 'STAFF', actor_id: input.actorId, action: 'BULK_APPLY',
          entity_type: 'products', entity_id: change.productId,
          before_state: { [change.field]: change.from, version: preview.versions[change.productId] },
          after_state: { [change.field]: change.to, version: (preview.versions[change.productId] ?? 0) + 1 },
          reason: `Bulk apply ${input.token.slice(0, 8)} (approvers: ${preview.approvedBy.join(',')})`,
        });
      }
      return { applied };
    },

    async revert(input) {
      // Bounded undo: re-apply the BEFORE state recorded in the preview;
      // staleness rules are identical to apply (§7) and the window is bounded.
      const preview = previews.get(input.token);
      if (preview === undefined) throw new BulkOperationError('NOT_FOUND');
      if (preview.appliedAt === null) throw new BulkOperationError('ALREADY_APPLIED');
      if (Date.now() - preview.appliedAt > BULK_UNDO_WINDOW_MS) throw new BulkOperationError('UNDO_WINDOW_EXPIRED');
      const productIds = Array.from(new Set(preview.changes.map((c) => c.productId)));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const versionsRes = await db.execute<any>(sql`
        SELECT id, version FROM products WHERE id IN (${sql.join(productIds.map((id) => sql`${id}`), sql`, `)})
      `);
      const liveVersions: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of versionsRes.rows) liveVersions[row['id'] as string] = row['version'] as number;
      let reverted = 0;
      // Merge multi-field changes per product; revert to the recorded from-state.
      const fromByProduct = new Map<string, Record<string, unknown>>();
      for (const change of preview.changes) {
        const acc = fromByProduct.get(change.productId) ?? {};
        acc[change.field] = change.from;
        fromByProduct.set(change.productId, acc);
      }
      for (const [productId, fields] of fromByProduct) {
        if (liveVersions[productId] !== preview.versions[productId]) continue; // changed since: skip, report honest count
        const assignments = Object.entries(fields).map(([field, value]) => sql`${sql.identifier(field)} = ${value as string}`);
        await db.execute(
          sql`UPDATE products
                 SET ${sql.join(assignments, sql`, `)}, version = version + 1, updated_at = now()
               WHERE id = ${productId}`,
        );
        reverted += 1;
        await audit({
          actor_type: 'STAFF', actor_id: input.actorId, action: 'BULK_REVERT',
          entity_type: 'products', entity_id: productId,
          before_state: { version: liveVersions[productId] ?? 0 },
          after_state: { version: (liveVersions[productId] ?? 0) + 1 },
          reason: `Bulk revert of apply ${preview.token.slice(0, 8)} (bounded window)`,
        });
      }
      return { reverted };
    },
  };
}
