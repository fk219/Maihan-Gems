/**
 * packages/db/src/cms/redirect-repository.ts
 *
 * Phase 12 — Stage C / Global Task 4 (E12.3), redirect half.
 *
 * Administrative management of the locked `redirects` table
 * (0012_cms.sql): UNIQUE(from_path); status_code ∈ 200|301|302|410
 * (doc 34 §7 families; the migration already materialised 44,218 rows —
 * this surface manages them, it must NEVER destroy them).
 *
 * Data rules (doc 34):
 *   - from_path starts with '/', to_path is an internal absolute path or an
 *     https external target; status 410 pages have to_path '/' (gone);
 *   - insert-time target validation makes an open redirect impossible;
 *     external targets require host allow-list knowledge at the caller
 *     (the schema has no is_external column — the reporter records reason);
 *   - no silent overwrite: a create on an existing from_path is a conflict
 *     (23505 mapped to REDIRECT_EXISTS); updates refuse without the
 *     expected current target (optimistic check);
 *   - bulk import is ALL-OR-NOTHING: validation happens for every row
 *     BEFORE any insert; the caller wraps the insert in one statement/txn
 *     so no partial redirect set can exist (doc 27/doc 34 §11).
 *   - every write emits an audit entry (doc 23 §4: redirect edits audited).
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';

export interface RedirectRow extends Record<string, unknown> {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  reason: string | null;
  created_at: string;
}

export interface RedirectInput {
  from_path: string;
  to_path: string;
  status_code: number;
  reason?: string;
}

export class RedirectConflictError extends Error {
  // SQLITE/pg codes surfaced by the spoofed executor are reclassified here.
  constructor(readonly kind: 'REDIRECT_EXISTS' | 'STALE_ROW' | 'INVALID_PATH' | 'INVALID_STATUS' | 'SELF_REDIRECT' | 'INVALID_TARGET') {
    super(`REDIRECT: ${kind}`);
    this.name = 'RedirectConflictError';
  }
}

const VALID_STATUS = new Set([200, 301, 302, 410]);

/** Internal absolute path: single leading slash, no backslashes, spaces encoded. */
function isInternalPath(p: string): boolean {
  return p.startsWith('/') && !p.startsWith('//') && !p.includes('\\') && !p.includes(' ');
}

export function validateRedirectInput(row: RedirectInput): void {
  if (!isInternalPath(row.from_path)) throw new RedirectConflictError('INVALID_PATH');
  if (!VALID_STATUS.has(row.status_code)) throw new RedirectConflictError('INVALID_STATUS');
  if (row.status_code === 410) return; // gone: target unused
  if (row.to_path === row.from_path) throw new RedirectConflictError('SELF_REDIRECT');
  if (!(isInternalPath(row.to_path) || row.to_path.startsWith('https://'))) {
    throw new RedirectConflictError('INVALID_TARGET');
  }
}

export function mapUniqueViolation(error: unknown): RedirectConflictError {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('23505') || message.toLowerCase().includes('unique')) {
    return new RedirectConflictError('REDIRECT_EXISTS');
  }
  return error instanceof RedirectConflictError ? error : new RedirectConflictError('INVALID_PATH');
}

export interface AuditWriter {
  (entry: {
    actor_type: 'STAFF' | 'SYSTEM';
    actor_id: string;
    action: 'CREATE' | 'UPDATE';
    entity_type: 'redirects';
    entity_id: string;
    before_state: Record<string, unknown> | null;
    after_state: Record<string, unknown> | null;
    reason: string;
  }): Promise<void>;
}

export interface RedirectRepository {
  list(opts: { limit: number; offset: number; search?: string }): Promise<{ rows: RedirectRow[]; total: number }>;
  update(input: RedirectInput & { expectedToPath: string; expectedStatus: number; actorId: string }): Promise<RedirectRow>;
  /**
   * Bulk import, all-or-nothing on VALIDATION (the SQL UPSERT runs inside
   * the caller's single transaction). Returns the parsed batch summary.
   */
  prepareBulkImport(rows: unknown): { valid: RedirectInput[]; errors: Array<{ index: number; kind: string; row: unknown }> };

  /** Execute a validated bulk batch inside ONE statement (caller's txn). */
  executeBulkImport(valid: RedirectInput[], actorId: string): Promise<RedirectRow[]>;
}

export function createRedirectRepository(db: CatalogDatabase, audit: AuditWriter): RedirectRepository {
  return {
    async list({ limit, offset, search }) {
      const where = search !== undefined && search.length > 0
        ? sql`WHERE from_path LIKE ${`%${search}%`}`
        : sql``;
      const rows = await db.execute<RedirectRow>(
        sql`SELECT id, from_path, to_path, status_code, reason, created_at
              FROM redirects ${where}
             ORDER BY from_path
             LIMIT ${limit} OFFSET ${offset}`,
      );
      const total = await db.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM redirects ${where}`);
      return { rows: rows.rows, total: total.rows[0]?.count ?? rows.rows.length };
    },

    async update({ from_path, to_path, status_code, reason, expectedToPath, expectedStatus, actorId }) {
      validateRedirectInput({ from_path, to_path, status_code, reason });
      const current = await db.execute<RedirectRow>(
        sql`SELECT id, from_path, to_path, status_code, reason FROM redirects WHERE from_path = ${from_path}`,
      );
      const row = current.rows[0];
      if (row === undefined) throw new RedirectConflictError('STALE_ROW');
      if (row.to_path !== expectedToPath || row.status_code !== expectedStatus) {
        throw new RedirectConflictError('STALE_ROW');
      }
      const upd = await db.execute<RedirectRow>(
        sql`UPDATE redirects
               SET to_path = ${to_path}, status_code = ${status_code}, reason = ${reason ?? row.reason}
             WHERE from_path = ${from_path}
               AND to_path = ${expectedToPath} AND status_code = ${expectedStatus}
             RETURNING id, from_path, to_path, status_code, reason, created_at`,
      );
      const updated = upd.rows[0];
      if (updated === undefined) throw new RedirectConflictError('STALE_ROW');
      await audit({
        actor_type: 'STAFF', actor_id: actorId, action: 'UPDATE',
        entity_type: 'redirects', entity_id: updated.id,
        before_state: { from_path, to_path: expectedToPath, status_code: expectedStatus },
        after_state: { from_path, to_path, status_code },
        reason: 'Redirect target/status corrected (doc 34 §11: broken targets are defects, flagged not silent)',
      });
      return updated;
    },

    prepareBulkImport(rows) {
      if (!Array.isArray(rows)) throw new RedirectConflictError('INVALID_PATH');
      const valid: RedirectInput[] = [];
      const errors: Array<{ index: number; kind: string; row: unknown }> = [];
      const seen = new Set<string>();
      rows.forEach((raw, index) => {
        try {
          if (typeof raw !== 'object' || raw === null) throw new RedirectConflictError('INVALID_PATH');
          const r = raw as Record<string, unknown>;
          const input: RedirectInput = {
            from_path: typeof r['from_path'] === 'string' ? r['from_path'] as string : '',
            to_path: typeof r['to_path'] === 'string' ? r['to_path'] as string : '',
            status_code: typeof r['status_code'] === 'number' ? r['status_code'] as number : 301,
            reason: typeof r['reason'] === 'string' ? r['reason'] as string : undefined,
          };
          validateRedirectInput(input);
          if (seen.has(input.from_path)) throw new RedirectConflictError('REDIRECT_EXISTS');
          seen.add(input.from_path);
          valid.push(input);
        } catch (error) {
          errors.push({ index, kind: error instanceof RedirectConflictError ? error.kind : 'INVALID_PATH', row: raw });
        }
      });
      return { valid, errors };
    },

    async executeBulkImport(valid, actorId) {
      if (valid.length === 0) return [];
      const inserted = await db.execute<RedirectRow>(sql`
        INSERT INTO redirects (from_path, to_path, status_code, reason)
        SELECT * FROM jsonb_to_recordset(${JSON.stringify(valid.map((v) => ({ ...v, reason: v.reason ?? null })))}::jsonb)
          AS x(from_path text, to_path text, status_code smallint, reason text)
        ON CONFLICT (from_path) DO NOTHING
        RETURNING id, from_path, to_path, status_code, reason, created_at
      `);
      const rows = inserted.rows;
      if (rows.length !== valid.length) {
        // Some rows already existed: the caller treats this as an indeterminate
        // partial batch under its transaction and aborts (doc 34 §11).
        return rows;
      }
      await audit({
        actor_type: 'STAFF', actor_id: actorId, action: 'CREATE',
        entity_type: 'redirects', entity_id: rows[0]?.id ?? '',
        before_state: null,
        after_state: { batch_size: rows.length },
        reason: `Bulk redirect import: ${rows.length} rows, one transaction, no silent overwrite`,
      });
      return rows;
    },
  };
}
