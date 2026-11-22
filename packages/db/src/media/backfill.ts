/**
 * packages/db/src/media/backfill.ts
 *
 * Track A4 — the asset backfill planner and runner.
 *
 * The planner is pure: rows in, decisions out, no clock, no database, no
 * network. That is what makes the disposition of every imported media record
 * testable, and it is the mechanism behind the design rule that `SKIPPED`
 * with a reason is a first-class terminal state (technical_design/24 §4):
 * roughly half the 241,961 captured media records are site chrome, and a
 * silent drop is indistinguishable from a failed fetch.
 *
 * Reason precedence is fixed and intentional:
 *
 *   ALREADY_READY  the row already reached a terminal state; rewriting it
 *                  would destroy the recorded reason and is not idempotent
 *   NO_URL         nothing fetchable (missing, malformed, or not http/https)
 *   CHILD_CHROME   navigation, layout, filter swatches, JavaScript bundles
 *   UNSUPPORTED_TYPE  a kind or MIME type this pipeline cannot validate
 *   RETRY_LIMIT    failed often enough; terminal, with the reason kept
 *   FETCH          actionable
 *
 * `limit` caps how many FETCH decisions one run may take. Rows that are
 * otherwise fetchable but fall outside the budget are returned in `deferred`
 * — explicitly, never as a `SKIP`, because writing SKIPPED for a row that is
 * merely waiting would be a lie and would break resumability.
 *
 * The runner below applies a plan through a small store port. It is written
 * so a second run over the same rows is a no-op:
 *   - READY/SKIPPED rows are never fetched again;
 *   - a crash after `markFetching` leaves the row resumable;
 *   - failures are counted in `processing_error`, never swallowed;
 *   - the final `stateCounts` accounts for every row in the table.
 */
import { ingestBytes } from './ingest.js';
import { MediaPolicyError } from './policy.js';
import type { ObjectStorage } from './storage.js';

export const BACKFILL_SKIP_REASONS = [
  'NO_URL',
  'UNSUPPORTED_TYPE',
  'CHILD_CHROME',
  'ALREADY_READY',
  'RETRY_LIMIT',
] as const;

export type BackfillSkipReason = (typeof BACKFILL_SKIP_REASONS)[number];
export type BackfillAction = 'FETCH' | 'SKIP';

export const DEFAULT_RETRY_LIMIT = 3;

/** The storefront image pipeline accepts these `media_kind` values. */
export const DEFAULT_SUPPORTED_KINDS: readonly string[] = Object.freeze(['IMAGE', 'LIFESTYLE']);

/** Must stay in step with `MEDIA_POLICIES.IMAGE.contentTypes` in policy.ts. */
export const DEFAULT_SUPPORTED_MIME_TYPES: readonly string[] = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

export interface BackfillAssetRow {
  readonly id: string;
  readonly sourceUrl: string | null;
  readonly kind: string;
  readonly role?: string | null;
  readonly sourcePathStem?: string | null;
  readonly mimeType?: string | null;
  readonly processingState: string;
  readonly processingError?: string | null;
  /** Optional explicit attempt count; otherwise parsed from processingError. */
  readonly attempts?: number | null;
}

export interface BackfillPlanOptions {
  /** Maximum FETCH decisions in this plan. Default: unlimited. */
  readonly limit?: number;
  /** Failures before a row becomes terminal RETRY_LIMIT. Default: 3. */
  readonly retryLimit?: number;
  readonly supportedKinds?: readonly string[];
  readonly supportedMimeTypes?: readonly string[];
}

export interface BackfillDecision {
  readonly assetId: string;
  readonly action: BackfillAction;
  /** Present exactly when `action === 'SKIP'`. */
  readonly reason?: BackfillSkipReason;
  readonly sourceUrl?: string;
}

export interface BackfillPlan {
  /** One decision per actionable row, in input order. */
  readonly decisions: readonly BackfillDecision[];
  /**
   * Fetchable rows outside the `limit`. Deliberately NOT marked SKIPPED:
   * they stay pending and are picked up by the next run.
   */
  readonly deferred: readonly string[];
  readonly counts: Readonly<Record<'FETCH' | BackfillSkipReason, number>>;
}

export class BackfillPlanError extends Error {
  constructor(message: string) {
    super(`BACKFILL_PLAN: ${message}`);
    this.name = 'BackfillPlanError';
  }
}

const HTTP_SCHEMES = new Set(['http:', 'https:']);

function parseHttpUrl(value: string | null | undefined): URL | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  try {
    const url = new URL(trimmed);
    return HTTP_SCHEMES.has(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

const CHROME_STEM_PREFIXES = [
  'images/normal/mainmenu',
  'images/normal/filters',
  'images/normal/logos',
  'images/normal/layout',
  'images/normal/hi-res',
] as const;

/**
 * Site chrome is disposed of explicitly rather than fetched and discarded.
 * The patterns come from technical_design/24 §2; `/_nuxt/*.js` is defect D4
 * (JavaScript bundles misfiled as 3D or 360 media).
 */
export function isChildChrome(
  sourceUrl: string | null | undefined,
  sourcePathStem: string | null | undefined,
): boolean {
  const url = parseHttpUrl(sourceUrl);
  const path = (url?.pathname ?? '').toLowerCase();
  const stem = (sourcePathStem ?? '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();

  if (path.endsWith('.js') || path.includes('/_nuxt/')) return true;

  for (const prefix of CHROME_STEM_PREFIXES) {
    if (stem === prefix || stem.startsWith(`${prefix}/`)) return true;
  }

  if (path.includes('/static/images/') && (url?.hostname ?? '').includes('47thst')) return true;

  return false;
}

/** Explicit attempts win; otherwise the runner's `attempt=N` marker is read. */
export function readAttemptCount(row: BackfillAssetRow): number {
  const explicit = row.attempts;
  if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit >= 0) {
    return Math.floor(explicit);
  }
  const match = /(?:^|[;\s])attempt=(\d+)/.exec(row.processingError ?? '');
  if (match === null) return 0;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function normaliseMimeType(value: string | null | undefined): string {
  return (value ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
}

function isTerminalState(state: string): boolean {
  return state === 'READY' || state === 'SKIPPED';
}

function classify(
  row: BackfillAssetRow,
  options: Required<Pick<BackfillPlanOptions, 'retryLimit' | 'supportedKinds' | 'supportedMimeTypes'>>,
): BackfillSkipReason | null {
  if (isTerminalState(row.processingState)) return 'ALREADY_READY';
  if (parseHttpUrl(row.sourceUrl) === null) return 'NO_URL';
  if (isChildChrome(row.sourceUrl, row.sourcePathStem)) return 'CHILD_CHROME';

  if (!options.supportedKinds.includes(row.kind)) return 'UNSUPPORTED_TYPE';
  const mimeType = normaliseMimeType(row.mimeType);
  if (mimeType.length > 0 && !options.supportedMimeTypes.includes(mimeType)) {
    return 'UNSUPPORTED_TYPE';
  }

  if (readAttemptCount(row) >= options.retryLimit) return 'RETRY_LIMIT';
  return null;
}

/**
 * Decide what to do with each row. Pure and deterministic: the same rows and
 * options always produce the same plan, and input order is preserved.
 */
export function planAssetBackfill(
  rows: readonly BackfillAssetRow[],
  options: BackfillPlanOptions = {},
): BackfillPlan {
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  if (limit !== Number.POSITIVE_INFINITY && (!Number.isInteger(limit) || limit < 0)) {
    throw new BackfillPlanError('limit must be a non-negative integer');
  }
  const retryLimit = options.retryLimit ?? DEFAULT_RETRY_LIMIT;
  if (!Number.isInteger(retryLimit) || retryLimit < 1) {
    throw new BackfillPlanError('retryLimit must be a positive integer');
  }

  const resolved = {
    retryLimit,
    supportedKinds: options.supportedKinds ?? DEFAULT_SUPPORTED_KINDS,
    supportedMimeTypes: options.supportedMimeTypes ?? DEFAULT_SUPPORTED_MIME_TYPES,
  } as const;

  const counts: Record<'FETCH' | BackfillSkipReason, number> = {
    FETCH: 0,
    NO_URL: 0,
    UNSUPPORTED_TYPE: 0,
    CHILD_CHROME: 0,
    ALREADY_READY: 0,
    RETRY_LIMIT: 0,
  };

  const decisions: BackfillDecision[] = [];
  const deferred: string[] = [];
  let fetchBudget = limit;

  for (const row of rows) {
    const skipReason = classify(row, resolved);
    if (skipReason !== null) {
      counts[skipReason] += 1;
      decisions.push({ assetId: row.id, action: 'SKIP', reason: skipReason });
      continue;
    }

    if (fetchBudget < 1) {
      deferred.push(row.id);
      continue;
    }

    fetchBudget -= 1;
    counts.FETCH += 1;
    decisions.push({
      assetId: row.id,
      action: 'FETCH',
      ...(row.sourceUrl === null ? {} : { sourceUrl: row.sourceUrl }),
    });
  }

  return { decisions, deferred, counts };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export interface ReadyAssetInput {
  readonly storageKey: string;
  readonly storageProvider: string;
  readonly contentType: string;
  readonly bytes: number;
  readonly sha256: string;
}

/** The slice of the `assets` table the runner needs. */
export interface BackfillStore {
  listCandidates(limit: number): Promise<readonly BackfillAssetRow[]>;
  /**
   * Record the attempt BEFORE the network call. If the process dies mid-fetch
   * the attempt survives, so a crash cannot retry forever without counting.
   */
  markFetching(assetId: string, attempt: number): Promise<void>;
  markReady(assetId: string, stored: ReadyAssetInput): Promise<void>;
  markSkipped(assetId: string, reason: BackfillSkipReason): Promise<void>;
  markFailed(assetId: string, failure: string): Promise<void>;
  /** Counts for EVERY non-deleted asset, so nothing is unaccounted for. */
  countByState(): Promise<Readonly<Record<string, number>>>;
}

export interface AssetFetchResult {
  readonly bytes: Uint8Array;
  readonly contentType: string;
}

export type AssetFetcher = (row: BackfillAssetRow) => Promise<AssetFetchResult>;

export interface BackfillRunnerDeps {
  readonly store: BackfillStore;
  readonly storage: ObjectStorage;
  readonly fetchBytes: AssetFetcher;
}

export interface BackfillRunnerOptions {
  readonly limit?: number;
  readonly retryLimit?: number;
  /** Label persisted in `assets.storage_provider` (r2, s3, local). */
  readonly provider: string;
}

export type BackfillItemOutcome = 'READY' | 'SKIPPED' | 'FAILED' | 'DEFERRED';

export interface BackfillRunItem {
  readonly assetId: string;
  readonly outcome: BackfillItemOutcome;
  readonly reason?: string;
}

export interface BackfillRunReport {
  readonly items: readonly BackfillRunItem[];
  readonly fetched: number;
  readonly ready: number;
  readonly skipped: number;
  readonly failed: number;
  readonly deferred: number;
  readonly stateCounts: Readonly<Record<string, number>>;
}

export const DEFAULT_BACKFILL_LIMIT = 100;
export const ASSET_FETCH_TIMEOUT_MS = 20_000;

/**
 * Default fetcher. It reads bytes only — validation stays in `ingestBytes`,
 * so an HTML error page served with HTTP 200 is rejected by the magic-byte
 * check rather than stored as a photograph (technical_design/24 §3).
 */
export async function fetchAssetBytes(row: BackfillAssetRow): Promise<AssetFetchResult> {
  const sourceUrl = row.sourceUrl?.trim();
  if (sourceUrl === undefined || sourceUrl.length === 0) {
    throw new Error('NO_URL');
  }

  const response = await fetch(sourceUrl, {
    redirect: 'follow',
    headers: { accept: 'image/*' },
    signal: AbortSignal.timeout(ASSET_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);

  const headerType = normaliseMimeType(response.headers.get('content-type'));
  const rowType = normaliseMimeType(row.mimeType ?? null);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { bytes, contentType: headerType.length > 0 ? headerType : rowType };
}

function failureCode(error: unknown): string {
  if (error instanceof MediaPolicyError) return error.code;
  return 'FETCH_FAILED';
}

/**
 * Apply one backfill plan. A failed asset never aborts the run; a broken
 * store does, because continuing would risk losing state.
 */
export async function runAssetBackfill(
  deps: BackfillRunnerDeps,
  options: BackfillRunnerOptions,
): Promise<BackfillRunReport> {
  const limit = options.limit ?? DEFAULT_BACKFILL_LIMIT;
  const retryLimit = options.retryLimit ?? DEFAULT_RETRY_LIMIT;
  if (!Number.isInteger(limit) || limit < 0) {
    throw new BackfillPlanError('limit must be a non-negative integer');
  }

  const rows = await deps.store.listCandidates(limit);
  const plan = planAssetBackfill(rows, { limit, retryLimit });
  const byId = new Map(rows.map((row) => [row.id, row] as const));

  const items: BackfillRunItem[] = [];
  let fetched = 0;
  let ready = 0;
  let skipped = 0;
  let failed = 0;

  for (const decision of plan.decisions) {
    const row = byId.get(decision.assetId);
    if (row === undefined) {
      throw new BackfillPlanError(`decision for unknown asset ${decision.assetId}`);
    }

    if (decision.action === 'SKIP') {
      const reason = decision.reason as BackfillSkipReason;
      // A terminal row is NOT rewritten: that would erase the original
      // skipped reason and make a second run differ from the first.
      if (reason !== 'ALREADY_READY') {
        await deps.store.markSkipped(row.id, reason);
      }
      skipped += 1;
      items.push({ assetId: row.id, outcome: 'SKIPPED', reason });
      continue;
    }

    const attempt = readAttemptCount(row) + 1;
    await deps.store.markFetching(row.id, attempt);
    fetched += 1;

    try {
      const fetchedAsset = await deps.fetchBytes(row);
      const stored = await ingestBytes(deps.storage, {
        kind: 'IMAGE',
        declaredContentType: fetchedAsset.contentType,
        bytes: fetchedAsset.bytes,
      });
      await deps.store.markReady(row.id, {
        storageKey: stored.key,
        storageProvider: options.provider,
        contentType: stored.contentType,
        bytes: stored.size,
        sha256: stored.sha256,
      });
      ready += 1;
      items.push({ assetId: row.id, outcome: 'READY' });
    } catch (error) {
      if (attempt >= retryLimit) {
        await deps.store.markSkipped(row.id, 'RETRY_LIMIT');
        skipped += 1;
        items.push({ assetId: row.id, outcome: 'SKIPPED', reason: 'RETRY_LIMIT' });
      } else {
        const code = failureCode(error);
        await deps.store.markFailed(row.id, `attempt=${attempt}; ${code}`);
        failed += 1;
        items.push({ assetId: row.id, outcome: 'FAILED', reason: code });
      }
    }
  }

  for (const assetId of plan.deferred) {
    items.push({ assetId, outcome: 'DEFERRED' });
  }

  return {
    items,
    fetched,
    ready,
    skipped,
    failed,
    deferred: plan.deferred.length,
    stateCounts: await deps.store.countByState(),
  };
}
