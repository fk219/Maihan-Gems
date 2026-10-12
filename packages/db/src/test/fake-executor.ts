/**
 * packages/db/src/test/fake-executor.ts
 *
 * A minimal in-memory executor emulation for the CMS repository lifecycle
 * tests. It implements the small SQL surface the repository uses (template
 * SQL from drizzle's `sql``) and回族 resolves states in memory. The fake is
 * deliberately table-shape-aware (pages / page_revisions / page_review_state)
 * but does not emulate PostgreSQL semantics beyond what the lifecycle tests
 * require. Tests against real constraints stay in the schema-fidelity and
 * migration suites.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export interface AuditRow {
  actor_type: 'STAFF' | 'SYSTEM';
  actor_id: string;
  action: string;
  entity_type: 'pages' | 'page_revisions' | string;
  entity_id: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  reason: string;
}

export interface FakeExecutorState {
  pages: Map<string, Any>;
  revisions: Map<string, Any>;
  review: Map<string, Any>;
  audit: AuditRow[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (query: any) => Promise<{ rows: Any[]; rowCount?: number }>;
}

let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${String(idCounter).padStart(4, '0')}`;
}

/** Deserialise a drizzle `sql` template into text + ordered values. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decompose(query: any): { text: string; values: Any[] } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunks: any[] = Array.isArray(query?.queryChunks) ? query.queryChunks : [];
  const result = walk(chunks);
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function walk(chunks: any[]): { text: string; values: Any[] } {
  const parts: string[] = [];
  const values: Any[] = [];
  for (const chunk of chunks) {
    // Static SQL text arrives as the StringChunk { value: [string...] }.
    if (Array.isArray(chunk?.value) && chunk.value.every((p: unknown) => typeof p === 'string')) {
      parts.push(chunk.value.join(''));
      continue;
    }
    // An interpolated SQL fragment (e.g. a column list) carries queryChunks.
    if (Array.isArray(chunk?.queryChunks)) {
      const inner = walk(chunk.queryChunks);
      parts.push(inner.text);
      continue; // fragments contribute no parameters in this repo's usage
    }
    // A bound parameter: raw string primitive (drizzle inlines primitives as
    // string chunks) or a param object / null placeholder.
    parts.push('');
    if (chunk === null || chunk === undefined) {
      values.push(null);
    } else if (typeof chunk === 'string') {
      values.push(chunk);
    } else if (typeof chunk === 'object' && chunk.value !== undefined) {
      values.push(chunk.value);
    } else {
      values.push(chunk);
    }
  }
  return { text: parts.join(''), values };
}

export function buildFakeExecutor(): FakeExecutorState {
  const pages = new Map<string, Any>();
  const revisions = new Map<string, Any>();
  const review = new Map<string, Any>();
  const audit: AuditRow[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function execute(query: any): Promise<{ rows: Any[]; rowCount?: number }> {
    const { text: rawText, values } = decompose(query);
    const text = rawText.replace(/\s+/g, ' ');

    // ---- pages INSERT ... RETURNING -------------------------------------
    if (text.includes('INSERT INTO pages')) {
      const [slug, title, pageKind, blocksJson] = values;
      const page = {
        id: uid('pg'), slug, title, page_kind: pageKind,
        status: 'DRAFT', blocks: JSON.parse(blocksJson as string), version: 1,
      };
      pages.set(page.id, page);
      return { rows: [page] };
    }

    // ---- page_revisions INSERT ... RETURNING -----------------------------
    if (text.includes('INSERT INTO page_revisions')) {
      const [pageId, version, blocksJson, rawMarkdown, editorId, note] = values;
      const rev = {
        id: uid('rv'), page_id: pageId, version, blocks: JSON.parse(blocksJson as string),
        raw_markdown: rawMarkdown ?? null, editor_id: editorId, note: note ?? null,
      };
      revisions.set(rev.id, rev);
      return { rows: [rev] };
    }

    if (text.includes('INSERT INTO page_review_state')) {
      const [revisionId, reviewStateParam] = values;
      // 'PENDING' is an inlined SQL literal in the repository write; the fake
      // derives the state from the statement text when absent.
      const inline = /VALUES \(, '(\w+)'\)/.exec(text);
      const reviewState = (reviewStateParam as string) ?? inline?.[1] ?? 'PENDING';
      const entry = { revision_id: revisionId, review_state: reviewState, approved_by: null, decided_at: null };
      review.set(revisionId, entry);
      return { rows: [] };
    }

    // ---- page_review_state UPDATE ... RETURNING ---------------------------
    // Repo shapes: submitForReview inlines 'IN_REVIEW' as a literal and only
    // parameterises the revision_id; decideRevision parameterises BOTH the
    // decision and (when approving) the approver. Derive state from the text
    // first, fall back to query parameters.
    if (text.includes('UPDATE page_review_state')) {
      const revisionId = values[values.length - 1];
      const inlineState = /SET review_state = '?(\w+)'?/.exec(text)?.[1];
      const nextState = inlineState ?? values[0];
      const afterWhere = text.slice(text.indexOf('WHERE'));
      const guardMatch = /review_state IN \('PENDING','REJECTED'\)|review_state = 'IN_REVIEW'/.exec(afterWhere);
      const entry = review.get(revisionId);
      if (entry === undefined) return { rows: [] };
      const okCase = guardMatch === null
        ? true
        : guardMatch[0].includes('PENDING')
          ? ['PENDING', 'REJECTED'].includes(entry.review_state)
          : entry.review_state === 'IN_REVIEW';
      if (!okCase) return { rows: [] };
      if (typeof nextState === 'string') entry.review_state = nextState;
      if (text.includes('approved_by =')) {
        // decideRevision: [decision, approver|null, revisionId]. When the
        // decision is inlined ('APPROVED'), the approver is values[0].
        entry.approved_by = inlineState !== undefined ? (values[0] ?? null) : (values[1] ?? null);
      }
      if (text.includes('decided_at =')) entry.decided_at = new Date().toISOString();
      return { rows: [{ review_state: entry.review_state, approved_by: entry.approved_by, decided_at: entry.decided_at }] };
    }

    // ---- SELECT the joined revision row ----------------------------------
    if (text.includes('FROM page_revisions r') && text.includes('WHERE r.id =')) {
      const revisionId = values[0];
      const rev = revisions.get(revisionId);
      if (rev === undefined) return { rows: [] };
      const s = review.get(rev.id) ?? { review_state: null, approved_by: null, decided_at: null };
      return { rows: [{ ...rev, review_state: s.review_state, approved_by: s.approved_by, decided_at: s.decided_at }] };
    }

    // ---- listRevisions ----------------------------------------------------
    if (text.includes('FROM page_revisions r') && text.includes('WHERE r.page_id =')) {
      const pageId = values[0];
      const all = [...revisions.values()].filter((r) => r.page_id === pageId)
        .sort((a, b) => b.version - a.version)
        .map((r) => ({ ...r, ...(review.get(r.id) ?? {}) }));
      return { rows: all };
    }

    // ---- pages SELECT by id -------------------------------------------------
    if (text.startsWith('SELECT id, slug, title, page_kind, status, blocks, version FROM pages WHERE id =')) {
      const pageId = values[0];
      const page = pages.get(pageId);
      return page ? { rows: [{ ...page, blocks: JSON.stringify(page.blocks) }] } : { rows: [] };
    }

    // ---- decideRevision page_kind lookup ---------------------------------
    if (text.startsWith('SELECT page_kind FROM pages WHERE id =')) {
      const page = pages.get(values[0] as string);
      return page ? { rows: [{ page_kind: page.page_kind }] } : { rows: [] };
    }

    // ---- head revision state for publishApproved ---------------------------
    if (text.includes('ORDER BY r.version DESC LIMIT 1')) {
      const pageId = values[0];
      const revs = [...revisions.values()].filter((r) => r.page_id === pageId)
        .sort((a, b) => b.version - a.version);
      if (revs.length === 0) return { rows: [] };
      const s = review.get(revs[0]!.id);
      return { rows: [{ review_state: s?.review_state ?? null }] };
    }

    // ---- publishApproved UPDATE ----------------------------------------------
    if (text.includes('SET status = \'PUBLISHED\'')) {
      const pageId = values[0];
      const page = pages.get(pageId);
      if (page === undefined || page.status === 'ARCHIVED') return { rows: [] };
      page.status = 'PUBLISHED';
      return { rows: [{ ...page, blocks: JSON.stringify(page.blocks) }] };
    }

    // ---- archive UPDATE ----------------------------------------------------------
    if (text.includes('SET status = \'ARCHIVED\'')) {
      const pageId = values[0];
      const page = pages.get(pageId);
      if (page === undefined || page.status !== 'PUBLISHED') return { rows: [] };
      page.status = 'ARCHIVED';
      return { rows: [{ ...page, blocks: JSON.stringify(page.blocks) }] };
    }

    // ---- updateBlocks UPDATE pages SET blocks... -----------------------------
    // Decomposed SQL text contains NO placeholders — values are in query
    // order: [blocks, rawMarkdown, nextVersion, pageId, expectedVersion].
    if (text.includes('UPDATE pages SET blocks')) {
      const [blocksJson, rawMarkdown] = values;
      // Query order: [blocks, rawMarkdown, nextVersion, pageId, expectedVersion].
      const pageId = values[3];
      const expectedVersion = values[4];
      const page = pages.get(pageId);
      if (page === undefined || page.version !== expectedVersion) return { rows: [] };
      const nextVersion = (page.version as number) + 1;
      page.blocks = JSON.parse(blocksJson);
      page.version = nextVersion;
      if (text.includes('raw_markdown =')) {
        page.raw_markdown = rawMarkdown ?? null;
      }
      return { rows: [{ ...page, blocks: JSON.stringify(page.blocks) }] };
    }

    // ---- getPagePublished ------------------------------------------------------
    if (text.includes("p.status = 'PUBLISHED'")) {
      const slug = values[0];
      const page = [...pages.values()].find((p) => p.slug === slug && p.status === 'PUBLISHED');
      if (page === undefined) return { rows: [] };
      const revs = [...revisions.values()].filter((r) => r.page_id === page.id)
        .filter((r) => (review.get(r.id)?.review_state ?? null) === 'APPROVED')
        .sort((a, b) => b.version - a.version);
      if (revs.length === 0) return { rows: [] };
      return { rows: [{ ...page, blocks: revs[0]!.blocks, version: page.version }] };
    }

    // Unmatched statement — make it loud: lifecycle tests must cover all SQL.
    throw new Error(`fake-executor: unmatched SQL — ${text.slice(0, 160)} VALUES=${JSON.stringify(values)}`);
  }

  return { pages, revisions, review, audit, execute };
}
