/**
 * packages/db/src/cms/cms-repository.spec.ts
 *
 * Phase 12 Stage B — the page-lifecycle tests (plan task 2 + doc 22 §4):
 * transitions (incl. invalid ones), version-conflict refusal, the
 * two-person rule on trust-bearing kinds, audit completeness with
 * before/after state, and the published read path served from the approved
 * revision only.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildFakeExecutor,
  type FakeExecutorState,
} from '../test/fake-executor.js';
import {
  createCmsRepository,
} from './cms-repository.js';

let state: FakeExecutorState;
let auditLog: Array<Parameters<Parameters<typeof createCmsRepository>[1]>[0]>;

function makeRepo() {
  auditLog = [];
  state = buildFakeExecutor();
  const db = { execute: state.execute } as never;
  // The repo's audit seam writes through the SAME audit_logs entry shape;
  // collect for completeness assertions.
  const audit = async (entry: Parameters<Parameters<typeof createCmsRepository>[1]>[0]) => { auditLog.push(entry); };
  return createCmsRepository(db, audit);
}

describe('page lifecycle (E12.2 / doc 22 §4)', () => {
  let repo: ReturnType<typeof makeRepo>;

  beforeEach(() => {
    repo = makeRepo();
  });

  it('creates a DRAFT page with an audit row and version 1', async () => {
    const page = await repo.createPage({
      slug: 'buying-guide', title: 'Buying Guide', pageKind: 'BUYING_GUIDE',
      blocks: [], actorId: 'editor-1',
    });
    expect(page.status).toBe('DRAFT');
    expect(page.version).toBe(1);
    expect(auditLog).toHaveLength(1);
    expect(auditLog[0]).toMatchObject({
      action: 'CREATE', entity_type: 'pages',
      after_state: { status: 'DRAFT' }, before_state: null,
    });
  });

  it('records a draft revision, then blocks a stale concurrent write (VERSION_CONFLICT)', async () => {
    const page = await repo.createPage({ slug: 'p', title: 'P', pageKind: 'STATIC', blocks: [], actorId: 'e1' });
    await repo.updateBlocks({ pageId: page.id, blocks: [{ id: 'b1', type: 'CTA', props: { label: 'x', href: '/x' } }], expectedVersion: 1, editorId: 'e1' });
    // A second writer still targets version 1 — ref, not corrupt.
    await expect(repo.updateBlocks({ pageId: page.id, blocks: [], expectedVersion: 1, editorId: 'e2' }))
      .rejects.toMatchObject({ kind: 'VERSION_CONFLICT' });
  });

  it('submitThenDecideByAnotherApprover reaches APPROVED and the page publishes', async () => {
    const page = await repo.createPage({ slug: 'faq', title: 'FAQ', pageKind: 'FAQ', blocks: [], actorId: 'editor-1' });
    const { revision } = await repo.updateBlocks({ pageId: page.id, blocks: [], expectedVersion: 1, editorId: 'editor-2' });
    await repo.submitForReview({ revisionId: revision.id, editorId: 'editor-2' });
    const decided = await repo.decideRevision({ revisionId: revision.id, approverId: 'publisher-1', approve: true });
    expect(decided.review_state).toBe('APPROVED');
    const published = await repo.publishApproved({ pageId: page.id, actorId: 'publisher-1' });
    expect(published.status).toBe('PUBLISHED');
  });

  it('refuses self-approval on a trust-bearing kind (two-person rule)', async () => {
    const page = await repo.createPage({ slug: 'cert-guide', title: 'Certificates', pageKind: 'CERTIFICATE_GUIDE', blocks: [], actorId: 'editor-1' });
    const { revision } = await repo.updateBlocks({ pageId: page.id, blocks: [], expectedVersion: 1, editorId: 'trust-editor' });
    await repo.submitForReview({ revisionId: revision.id, editorId: 'trust-editor' });
    await expect(repo.decideRevision({ revisionId: revision.id, approverId: 'trust-editor', approve: true }))
      .rejects.toMatchObject({ kind: 'SELF_APPROVAL' });
    // A DIFFERENT approver is accepted.
    const ok = await repo.decideRevision({ revisionId: revision.id, approverId: 'trust-reviewer', approve: true });
    expect(ok.review_state).toBe('APPROVED');
  });

  it('refuses publishing when the head revision is not APPROVED', async () => {
    const page = await repo.createPage({ slug: 'x', title: 'X', pageKind: 'STATIC', blocks: [], actorId: 'e1' });
    await expect(repo.publishApproved({ pageId: page.id, actorId: 'e1' }))
      .rejects.toMatchObject({ kind: 'INVALID_TRANSITION' });
  });

  it('writeSevery decision (approve and reject) with audit before/after rows', async () => {
    const page = await repo.createPage({ slug: 'y', title: 'Y', pageKind: 'STATIC', blocks: [], actorId: 'e1' });
    const { revision } = await repo.updateBlocks({ pageId: page.id, blocks: [], expectedVersion: 1, editorId: 'e2' });
    await repo.submitForReview({ revisionId: revision.id, editorId: 'e2' });
    await repo.decideRevision({ revisionId: revision.id, approverId: 'pub-1', approve: false, note: 'Tone problem' });
    const decisions = auditLog.filter((a) => a.action === 'REJECT' || a.action === 'APPROVE');
    expect(decisions).toHaveLength(1);
    expect(decisions[0]!.before_state).toEqual({ review_state: 'IN_REVIEW' });
    expect(decisions[0]!.after_state).toMatchObject({ review_state: 'REJECTED' });
  });

  it('publishes ONLY the approved revision content on the public read path', async () => {
    const page = await repo.createPage({ slug: 'z', title: 'Z', pageKind: 'STATIC', blocks: [], actorId: 'e1' });
    // Draft v2 with marker content — NOT approved yet.
    await repo.updateBlocks({ pageId: page.id, blocks: [{ id: 'draft-only' }], expectedVersion: 1, editorId: 'e2', note: 'wip' });
    // Public read finds nothing to serve: unpublished pages never leak.
    const notPublished = await repo.getPagePublished(page.slug);
    expect(notPublished).toBeNull();
    // Approve v2 + publish: content becomes public from the approved revision.
    const revisions = await repo.listRevisions(page.id);
    await repo.submitForReview({ revisionId: revisions[0]!.id, editorId: 'e2' });
    await repo.decideRevision({ revisionId: revisions[0]!.id, approverId: 'pub', approve: true });
    await repo.publishApproved({ pageId: page.id, actorId: 'pub' });
    const published = await repo.getPagePublished(page.slug);
    expect(published).not.toBeNull();
    expect((published!.blocks as { id: string }[])[0]?.id).toBe('draft-only');
  });

  it('archive only applies to PUBLISHED pages (invalid elsewhere)', async () => {
    const page = await repo.createPage({ slug: 'a1', title: 'A', pageKind: 'STATIC', blocks: [], actorId: 'e1' });
    await expect(repo.archive({ pageId: page.id, actorId: 'e1', reason: 'obsolete' }))
      .rejects.toMatchObject({ kind: 'INVALID_TRANSITION' });
  });
});
