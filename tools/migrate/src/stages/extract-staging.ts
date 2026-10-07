/**
 * tools/migrate — stage "extract-staging" (Phase 2 Global Task 11 = plan
 * detailed task 3, epic E2.1 "Extract and integrity-gate").
 *
 * Plan task 11 (verbatim, INITIAL_IMPLEMENTATION_PLAN.md §37):
 *   "Implement the extract stage: load `urls.jsonl` verbatim into
 *    `staging_source_pages`." Done when "44,218 rows loaded unchanged".
 *
 * What this stage does and does not do:
 *
 *   - Loads every record of the verified `urls.jsonl` artifact VERBATIM:
 *     the record's whole JSON object goes into `staging_source_pages.
 *     source_json` UNMODIFIED, and the flat source columns carry the record's
 *     own values, never re-shaped ones. NO normalisation, NO slug parsing,
 *     NO family classification — that is the parse stage's job; staging
 *     never normalises (technical_design/33 §1, AGENTS.md 9).
 *   - Provenance: every row references the stage's durable `import_batches`
 *     row id; the artifact's SHA-256 was verified before execution and is
 *     recorded in the stage's durable notes.
 *   - Identity: `UNIQUE (import_batch_id, source_url)` is the natural key +
 *     conflict target, so a full re-execution inserts zero rows (deep
 *     idempotency, gate V17) while a duplicate URL in evidence halts.
 *   - The SPINE COUNT gate (44,218 == SoT §4.2) is a gate-runner assertion
 *     (`assertGate`), so fixture-driven stage tests can run this stage on
 *     small disposable manifests while CI holds the real corpus to 44,218.
 */
import type { StageContext } from './context.js';
import { jsonLines } from './context.js';

export const EXPECTED_EXTRACT_ROWS = 44_218;

/** '/cart/order-summary' — the URL's origin-stripped path INCLUDING any query string. */
function urlPath(url: string): string | null {
  const m = /^https?:\/\/[^/]+(\/\S*)$/.exec(url);
  return m?.[1] ?? null;
}

interface ExtractRow {
  readonly sourceUrl: string;
  readonly sourcePath: string | null;
  readonly sourcePageType: string | null;
  readonly sourceStatusCode: number | null;
  readonly sourceJsonText: string;
}

const BATCH_SIZE = 2_000;

export interface ExtractStageResult {
  readonly recordsSeen: number;
  readonly rowsLoaded: number;
}

export async function runExtractStaging(ctx: StageContext): Promise<ExtractStageResult> {
  const path = ctx.artifactPath('urls.jsonl');

  let seen = 0;
  let accepted = 0;
  let batch: ExtractRow[] = [];
  const seenUrls = new Set<string>();
  let batchNo = 0;

  const flush = async (): Promise<void> => {
    if (batch.length === 0) return;
    batchNo += 1;
    const valuesClauses: string[] = [];
    const params: unknown[] = [];
    // placeholders are derived from params.length per row
    for (const row of batch) {
      const start = params.length;
      params.push(ctx.importBatchId, row.sourceUrl, row.sourcePath, row.sourcePageType, row.sourceStatusCode, row.sourceJsonText);
      valuesClauses.push(`($${start + 1}, $${start + 2}, $${start + 3}, $${start + 4}, $${start + 5}, $${start + 6})`);
    }
    const result = await ctx.db.query(
      `INSERT INTO staging_source_pages (import_batch_id, source_url, source_path, source_page_type, source_status_code, source_json)
       VALUES ${valuesClauses.join(', ')}
       ON CONFLICT (import_batch_id, source_url) DO NOTHING`,
      params,
    );
    accepted += result.rowCount ?? 0;
    batch = [];
    ctx.write(`  extract-staging: batch ${batchNo}, ${String(seen).padStart(6)} records read, ${String(accepted).padStart(6)} rows loaded`);
  };

  for await (const { record } of jsonLines(path)) {
    seen += 1;
    if (typeof record['url'] !== 'string' || (record['url'] as string).length === 0) {
      throw new Error(`extract-staging: record ${seen} has no url value; refusing (evidence is authoritative)`);
    }
    const url = record['url'];
    if (seenUrls.has(url)) {
      throw new Error(`extract-staging: duplicate source url at record ${seen}: ${url} (the spine must carry exactly one row per URL)`);
    }
    seenUrls.add(url);

    const crawl = (record['crawl'] ?? null) as { http_status?: unknown } | null;
    batch.push({
      sourceUrl: url,
      sourcePath: urlPath(url),
      // `source_title` has no urls.jsonl counterpart — it stays null (never a
      // value in place of data; 'the source said nothing' stays answerable).
      sourcePageType: typeof record['classification'] === 'string' ? (record['classification'] as string) : null,
      sourceStatusCode: typeof crawl?.http_status === 'number' ? crawl.http_status : null,
      sourceJsonText: JSON.stringify(record),
    });
    if (batch.length >= BATCH_SIZE) {
      await flush();
    }
  }
  await flush();

  if (seen === 0) {
    throw new Error('extract-staging: read 0 records — the artifact had no content (evidence absence is a halt, not a skip)');
  }
  const stored = await ctx.db.query<{ n: string }>(
    'SELECT count(*)::text AS n FROM staging_source_pages WHERE import_batch_id = $1',
    [ctx.importBatchId],
  );
  const storedCount = Number(stored.rows[0]?.n ?? '0');
  if (storedCount < seen) {
    throw new Error(
      `extract-staging: staged ${storedCount} rows but read ${seen} records — refusing to mark the stage complete`,
    );
  }

  return { recordsSeen: seen, rowsLoaded: storedCount };
}
