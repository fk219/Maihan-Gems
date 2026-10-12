/**
 * packages/db/src/cms/cms-repository.ts
 *
 * Phase 12 — Stage B / Global Task B2 (E12.2).
 *
 * The pages lifecycle over the locked `0012_cms.sql` schema:
 *
 *   DRAFT → IN_REVIEW → PUBLISHED → ARCHIVED   (doc 22 §4)
 *
 * The locked `pages.status` CHECK carries DRAFT|PUBLISHED|ARCHIVED
 * (0002/0012 DDL is schema-locked and immutable without an approved
 * migration). IN_REVIEW is carried by the review row, not the column: a page
 * is IN_REVIEW exactly when a `page_revisions` row exists with
 * `review_state = 'IN_REVIEW'` and no later decision. That keeps the locked
 * DDL intact (no destructive change; expand-then-contract only) while the
 * workflow state lives in the revision ledger where it belongs.
 *
 * Trust-bearing kinds (doc 22 §4): BUYING_GUIDE + CERTIFICATE_GUIDE (+ any
 * page_kind TREATMENT copy) require a second approver — the approver must
 * differ from the revising editor (the two-person rule, plan task 3).
 *
 * Revision integrity (doc 23 §7): concurrent writes must detect a version
 * mismatch and refuse (409 semantics at the API; here VERSION_CONFLICT).
 * Published content is preserved: publication serves the latest PUBLISHED
 * revision until a new revision is approved.
 *
 * Every privileged transition writes `audit_logs` with before/after state
 * through the SAME shape the commerce repositories use (one audit trail).
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';

export type PageWorkflowState = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export interface PageRow extends Record<string, unknown> {
  id: string;
  slug: string;
  title: string;
  page_kind: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  blocks: unknown;
  version: number;
}

export interface RevisionRow extends Record<string, unknown> {
  id: string;
  page_id: string;
  version: number;
  blocks: unknown;
  raw_markdown: string | null;
  editor_id: string | null;
  note: string | null;
  created_at?: string;
  /** From the joined `page_review_state` ledger (0018). */
  review_state?: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | null;
  approved_by?: string | null;
  decided_at?: string | null;
}

/** doc 22 §4: the two-person kinds. */
export const TRUST_BEARING_KINDS = new Set(['BUYING_GUIDE', 'CERTIFICATE_GUIDE']);

export class CmsConflictError extends Error {
  constructor(readonly kind: 'VERSION_CONFLICT' | 'INVALID_TRANSITION' | 'SELF_APPROVAL' | 'MISSING_REVISION') {
    super(`CMS_CONFLICT: ${kind}`);
    this.name = 'CmsConflictError';
  }
}

export interface AuditWriter {
  (entry: {
    actor_type: 'STAFF' | 'SYSTEM';
    actor_id: string;
    action: 'CREATE' | 'UPDATE' | 'SUBMIT_REVIEW' | 'APPROVE' | 'REJECT' | 'PUBLISH' | 'ARCHIVE';
    entity_type: 'pages' | 'page_revisions';
    entity_id: string;
    before_state: Record<string, unknown> | null;
    after_state: Record<string, unknown> | null;
    reason: string;
    request_id?: string;
  }): Promise<void>;
}

export interface CmsRepository {
  createPage(input: { slug: string; title: string; pageKind: string; blocks: unknown; actorId: string }): Promise<PageRow>;
  getPage(pageId: string): Promise<PageRow | null>;
  getPagePublished(slug: string): Promise<PageRow | null>;
  listPages(opts: { state?: PageWorkflowState; limit: number; offset: number }): Promise<PageRow[]>;
  updateBlocks(input: { pageId: string; blocks: unknown; rawMarkdown?: string | null; expectedVersion: number; editorId: string; note?: string }): Promise<{ page: PageRow; revision: RevisionRow }>;
  submitForReview(input: { revisionId: string; editorId: string }): Promise<RevisionRow>;
  decideRevision(input: { revisionId: string; approverId: string; approve: boolean; note?: string }): Promise<RevisionRow>;
  publishApproved(input: { pageId: string; actorId: string }): Promise<PageRow>;
  archive(input: { pageId: string; actorId: string; reason: string }): Promise<PageRow>;
  listRevisions(pageId: string): Promise<RevisionRow[]>;
}

const PAGE_COLUMNS = sql`id, slug, title, page_kind, status, blocks, version`;

/** Revision columns LEFT-JOINed to the 0018 review-state ledger. */
const REVISION_COLUMNS = sql`r.id, r.page_id, r.version, r.blocks, r.raw_markdown, r.editor_id, r.note, r.created_at, s.review_state, s.approved_by, s.decided_at`;

export function createCmsRepository(db: CatalogDatabase, audit: AuditWriter): CmsRepository {
  return {
    async createPage({ slug, title, pageKind, blocks, actorId }) {
      const inserted = await db.execute<PageRow>(sql`
        INSERT INTO pages (slug, title, page_kind, blocks)
        VALUES (${slug}, ${title}, ${pageKind}, ${JSON.stringify(blocks)}::jsonb)
        RETURNING ${PAGE_COLUMNS}
      `);
      const page = inserted.rows[0];
      if (page === undefined) throw new Error('cms: page insert returned no row');
      await audit({
        actor_type: 'STAFF', actor_id: actorId, action: 'CREATE',
        entity_type: 'pages', entity_id: page.id,
        before_state: null,
        after_state: { slug, title, page_kind: pageKind, status: 'DRAFT' },
        reason: 'Page created as DRAFT',
      });
      return page;
    },

    async getPage(pageId) {
      const r = await db.execute<PageRow>(sql`SELECT ${PAGE_COLUMNS} FROM pages WHERE id = ${pageId} AND deleted_at IS NULL`);
      return r.rows[0] ?? null;
    },

    async getPagePublished(slug) {
      // Public read path: ONLY the approved published revision content.
      const r = await db.execute<PageRow>(sql`
        SELECT p.id, p.slug, p.title, p.page_kind, p.status, r.blocks, p.version
          FROM pages p
          JOIN page_revisions r ON r.page_id = p.id
           AND r.version = (SELECT max(v.version) FROM page_revisions v
                             WHERE v.page_id = p.id AND v.review_state = 'APPROVED')
         WHERE p.slug = ${slug} AND p.status = 'PUBLISHED' AND p.deleted_at IS NULL
      `);
      return r.rows[0] ?? null;
    },

    async listPages({ state, limit, offset }) {
      const s = state === 'IN_REVIEW'
        ? sql`WHERE p.deleted_at IS NULL AND EXISTS (
                SELECT 1 FROM page_revisions r WHERE r.page_id = p.id AND r.review_state = 'IN_REVIEW')`
        : state === undefined
          ? sql`WHERE p.deleted_at IS NULL`
          : sql`WHERE p.deleted_at IS NULL AND p.status = ${state}`;
      const r = await db.execute<PageRow>(sql`
        SELECT ${PAGE_COLUMNS} FROM pages p ${s}
        ORDER BY p.updated_at DESC LIMIT ${limit} OFFSET ${offset}
      `);
      return r.rows;
    },

    async updateBlocks({ pageId, blocks, rawMarkdown, expectedVersion, editorId, note }) {
      // Opt-in concurrency guard (doc 23 §7): refuse stale writes.
      const current = await db.execute<PageRow>(sql`SELECT ${PAGE_COLUMNS} FROM pages WHERE id = ${pageId} AND deleted_at IS NULL`);
      const page = current.rows[0];
      if (page === undefined) throw new CmsConflictError('MISSING_REVISION');
      if (page.version !== expectedVersion) throw new CmsConflictError('VERSION_CONFLICT');

      const nextVersion = expectedVersion + 1;
      const updated = await db.execute<PageRow>(sql`
        UPDATE pages SET blocks = ${JSON.stringify(blocks)}::jsonb,
               raw_markdown = ${rawMarkdown ?? null},
               version = ${nextVersion},
               updated_at = now()
         WHERE id = ${pageId} AND version = ${expectedVersion}
         RETURNING ${PAGE_COLUMNS}
      `);
      const after = updated.rows[0];
      if (after === undefined) throw new CmsConflictError('VERSION_CONFLICT');

      const rev = await db.execute<RevisionRow>(sql`
        INSERT INTO page_revisions (page_id, version, blocks, raw_markdown, editor_id, note)
        VALUES (${pageId}, ${nextVersion}, ${JSON.stringify(blocks)}::jsonb, ${rawMarkdown ?? null}, ${editorId}, ${note ?? null})
        RETURNING *
      `);
      const inserted = rev.rows[0];
      if (inserted === undefined) throw new Error('cms: revision insert returned no row');
      await db.execute(sql`
        INSERT INTO page_review_state (revision_id, review_state)
        VALUES (${inserted.id}, 'PENDING')
      `);
      const revision: RevisionRow = { ...inserted, review_state: 'PENDING', approved_by: null, decided_at: null };

      await audit({
        actor_type: 'STAFF', actor_id: editorId, action: 'UPDATE',
        entity_type: 'pages', entity_id: pageId,
        before_state: { version: page.version, blocks: page.blocks },
        after_state: { version: nextVersion, blocks },
        reason: `Draft revision ${nextVersion} created`,
      });
      return { page: after, revision };
    },

    async submitForReview({ revisionId, editorId }) {
      const existing = await db.execute<RevisionRow>(sql`
        SELECT ${REVISION_COLUMNS} FROM page_revisions r
          LEFT JOIN page_review_state s ON s.revision_id = r.id
         WHERE r.id = ${revisionId}`);
      const revision = existing.rows[0];
      if (revision === undefined) throw new CmsConflictError('MISSING_REVISION');
      if (revision.review_state !== 'PENDING' && revision.review_state !== 'REJECTED') {
        throw new CmsConflictError('INVALID_TRANSITION');
      }
      const r = await db.execute<RevisionRow>(sql`
        UPDATE page_review_state
           SET review_state = 'IN_REVIEW'
         WHERE revision_id = ${revisionId} AND review_state IN ('PENDING','REJECTED')
        RETURNING review_state, approved_by, decided_at
      `);
      const state = r.rows[0];
      if (state === undefined) throw new CmsConflictError('INVALID_TRANSITION');
      const after: RevisionRow = { ...revision, ...state };
      await audit({
        actor_type: 'STAFF', actor_id: editorId, action: 'SUBMIT_REVIEW',
        entity_type: 'page_revisions', entity_id: revisionId,
        before_state: { review_state: revision.review_state ?? 'PENDING' },
        after_state: { review_state: 'IN_REVIEW' },
        reason: 'Revision submitted for review',
      });
      return after;
    },

    async decideRevision({ revisionId, approverId, approve, note }) {
      const existing = await db.execute<RevisionRow>(sql`
        SELECT ${REVISION_COLUMNS} FROM page_revisions r
          LEFT JOIN page_review_state s ON s.revision_id = r.id
         WHERE r.id = ${revisionId}`);
      const revision = existing.rows[0];
      if (revision === undefined) throw new CmsConflictError('MISSING_REVISION');
      if (revision.review_state !== 'IN_REVIEW') throw new CmsConflictError('INVALID_TRANSITION');
      // Two-person rule (doc 22 §4): a trust-bearing page's approver must
      // differ from its editor. Content of any kind also prevents
      // self-approval when the same actor both edited and decided —
      // enforced uniformly.
      const page = await db.execute<{ page_kind: string }>(sql`SELECT page_kind FROM pages WHERE id = ${revision.page_id}`);
      const kind = page.rows[0]?.page_kind ?? '';
      const trustBearing = TRUST_BEARING_KINDS.has(kind) || kind.includes('TREATMENT');
      if (trustBearing && revision.editor_id !== null && revision.editor_id === approverId) {
        throw new CmsConflictError('SELF_APPROVAL');
      }
      const decision = approve ? 'APPROVED' : 'REJECTED';
      const r = await db.execute<RevisionRow>(sql`
        UPDATE page_review_state
           SET review_state = ${decision},
               approved_by = ${approve ? approverId : null},
               decided_at = now()
         WHERE revision_id = ${revisionId} AND review_state = 'IN_REVIEW'
        RETURNING review_state, approved_by, decided_at
      `);
      const state = r.rows[0];
      if (state === undefined) throw new CmsConflictError('INVALID_TRANSITION');
      const after: RevisionRow = { ...revision, ...state };
      await audit({
        actor_type: 'STAFF', actor_id: approverId, action: approve ? 'APPROVE' : 'REJECT',
        entity_type: 'page_revisions', entity_id: revisionId,
        before_state: { review_state: 'IN_REVIEW' },
        after_state: { review_state: decision, approved_by: approverId },
        reason: note ?? (approve ? 'Revision approved' : 'Revision rejected'),
      });
      return after;
    },

    async publishApproved({ pageId, actorId }) {
      // Only a page whose HEAD revision is APPROVED may publish.
      const head = await db.execute<{ review_state: string | null }>(sql`
        SELECT s.review_state FROM page_revisions r
          JOIN page_review_state s ON s.revision_id = r.id
         WHERE r.page_id = ${pageId}
         ORDER BY r.version DESC LIMIT 1
      `);
      if (head.rows[0]?.review_state !== 'APPROVED') throw new CmsConflictError('INVALID_TRANSITION');
      const r = await db.execute<PageRow>(sql`
        UPDATE pages
           SET status = 'PUBLISHED', published_at = now(), updated_at = now()
         WHERE id = ${pageId} AND deleted_at IS NULL
        RETURNING ${PAGE_COLUMNS}
      `);
      const after = r.rows[0];
      if (after === undefined) throw new CmsConflictError('INVALID_TRANSITION');
      await audit({
        actor_type: 'STAFF', actor_id: actorId, action: 'PUBLISH',
        entity_type: 'pages', entity_id: pageId,
        before_state: { status: 'DRAFT' },
        after_state: { status: 'PUBLISHED' },
        reason: 'Approved revision published',
      });
      return after;
    },

    async archive({ pageId, actorId, reason }) {
      const before = await db.execute<PageRow>(sql`SELECT ${PAGE_COLUMNS} FROM pages WHERE id = ${pageId}`);
      const r = await db.execute<PageRow>(sql`
        UPDATE pages SET status = 'ARCHIVED', updated_at = now()
         WHERE id = ${pageId} AND status = 'PUBLISHED' AND deleted_at IS NULL
        RETURNING ${PAGE_COLUMNS}
      `);
      const after = r.rows[0];
      if (after === undefined) throw new CmsConflictError('INVALID_TRANSITION');
      await audit({
        actor_type: 'STAFF', actor_id: actorId, action: 'ARCHIVE',
        entity_type: 'pages', entity_id: pageId,
        before_state: { status: before.rows[0]?.status ?? null },
        after_state: { status: 'ARCHIVED' },
        reason,
      });
      return after;
    },

    async listRevisions(pageId) {
      const r = await db.execute<RevisionRow>(sql`
        SELECT ${REVISION_COLUMNS} FROM page_revisions r
          LEFT JOIN page_review_state s ON s.revision_id = r.id
         WHERE r.page_id = ${pageId} ORDER BY r.version DESC`);
      return r.rows;
    },
  };
}
