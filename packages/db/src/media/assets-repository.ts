/**
 * packages/db/src/media/assets-repository.ts
 *
 * Track A4/A5 — the `assets` table read/write surface the backfill runner
 * and the media delivery endpoint need.
 *
 * Scope is deliberately narrow. This is not a general asset CRUD repository;
 * it exposes exactly four things:
 *   - candidates for the backfill (non-terminal rows, oldest first);
 *   - the five state transitions the runner performs;
 *   - a state census, so a run can account for every row;
 *   - one READY row lookup for public delivery.
 *
 * SQL is composed with Drizzle's `sql` template (technical_design/03), every
 * value is a parameter, and every UPDATE is guarded so a terminal row cannot
 * be regressed or have its skip reason overwritten.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import type {
  BackfillAssetRow,
  BackfillSkipReason,
  BackfillStore,
  ReadyAssetInput,
} from './backfill.js';

/** Kinds and roles that must never be served from a public media endpoint. */
const PRIVATE_KINDS: readonly string[] = Object.freeze([
  'CERTIFICATE',
  'REPORT',
  'APPRAISAL',
  'DOCUMENT',
]);
const PRIVATE_ROLES: readonly string[] = Object.freeze([
  'CERTIFICATE',
  'REPORT',
  'APPRAISAL',
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAssetId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

interface RawAssetRow {
  id: string;
  source_url: string | null;
  kind: string;
  role: string | null;
  source_path_stem: string | null;
  mime_type: string | null;
  processing_state: string;
  processing_error: string | null;
}

export function mapAssetCandidate(row: RawAssetRow): BackfillAssetRow {
  return {
    id: row.id,
    sourceUrl: row.source_url,
    kind: row.kind,
    role: row.role,
    sourcePathStem: row.source_path_stem,
    mimeType: row.mime_type,
    processingState: row.processing_state,
    processingError: row.processing_error,
  };
}

export async function listBackfillCandidates(
  db: CatalogDatabase,
  limit: number,
): Promise<BackfillAssetRow[]> {
  const result = await db.execute(sql`
    SELECT
      id,
      source_url,
      kind::text AS kind,
      role::text AS role,
      source_path_stem,
      mime_type,
      processing_state::text AS processing_state,
      processing_error
    FROM assets
    WHERE deleted_at IS NULL
      AND processing_state IN ('PENDING', 'FETCHING', 'VALIDATING', 'PROCESSING', 'FAILED')
    ORDER BY created_at ASC, id ASC
    LIMIT ${limit}
  `);
  return (result.rows as unknown as RawAssetRow[]).map(mapAssetCandidate);
}

export async function markAssetFetching(
  db: CatalogDatabase,
  assetId: string,
  attempt: number,
): Promise<void> {
  await db.execute(sql`
    UPDATE assets
    SET processing_state = 'FETCHING',
        processing_error = ${`attempt=${attempt}`},
        updated_at = now()
    WHERE id = ${assetId}::uuid
      AND deleted_at IS NULL
      AND processing_state NOT IN ('READY', 'SKIPPED')
  `);
}

export async function markAssetReady(
  db: CatalogDatabase,
  assetId: string,
  stored: ReadyAssetInput,
): Promise<void> {
  await db.execute(sql`
    UPDATE assets
    SET processing_state = 'READY',
        storage_provider = ${stored.storageProvider},
        storage_key = ${stored.storageKey},
        mime_type = ${stored.contentType},
        bytes = ${stored.bytes},
        checksum_sha256 = ${stored.sha256},
        processing_error = NULL,
        updated_at = now()
    WHERE id = ${assetId}::uuid
      AND deleted_at IS NULL
      AND processing_state NOT IN ('READY', 'SKIPPED')
  `);
}

export async function markAssetSkipped(
  db: CatalogDatabase,
  assetId: string,
  reason: BackfillSkipReason,
): Promise<void> {
  await db.execute(sql`
    UPDATE assets
    SET processing_state = 'SKIPPED',
        processing_error = ${reason},
        updated_at = now()
    WHERE id = ${assetId}::uuid
      AND deleted_at IS NULL
      AND processing_state <> 'READY'
  `);
}

export async function markAssetFailed(
  db: CatalogDatabase,
  assetId: string,
  failure: string,
): Promise<void> {
  await db.execute(sql`
    UPDATE assets
    SET processing_state = 'FAILED',
        processing_error = ${failure},
        updated_at = now()
    WHERE id = ${assetId}::uuid
      AND deleted_at IS NULL
      AND processing_state NOT IN ('READY', 'SKIPPED')
  `);
}

/** Counts every non-deleted asset, including terminal rows. */
export async function countAssetsByState(
  db: CatalogDatabase,
): Promise<Record<string, number>> {
  const result = await db.execute(sql`
    SELECT processing_state::text AS processing_state, count(*)::int AS count
    FROM assets
    WHERE deleted_at IS NULL
    GROUP BY processing_state
    ORDER BY processing_state ASC
  `);
  const counts: Record<string, number> = {};
  for (const row of result.rows as unknown as Array<{ processing_state: string; count: number }>) {
    counts[row.processing_state] = Number(row.count);
  }
  return counts;
}

/** Bind the runner's store port to the assets table and one provider label. */
export function createAssetsBackfillStore(db: CatalogDatabase): BackfillStore {
  return {
    listCandidates: (limit) => listBackfillCandidates(db, limit),
    markFetching: (assetId, attempt) => markAssetFetching(db, assetId, attempt),
    markReady: (assetId, stored) => markAssetReady(db, assetId, stored),
    markSkipped: (assetId, reason) => markAssetSkipped(db, assetId, reason),
    markFailed: (assetId, failure) => markAssetFailed(db, assetId, failure),
    countByState: () => countAssetsByState(db),
  };
}

export interface DeliverableAssetRow {
  readonly id: string;
  readonly kind: string;
  readonly role: string;
  readonly storageKey: string;
  readonly processingState: string;
}

/**
 * A public media redirect is allowed only for a READY row that has a key and
 * is not a certificate, report, appraisal or document. Those are private
 * (technical_design/24 §6, NFR-11) and are served by a different, audited
 * endpoint after an authorization check.
 */
export function isPubliclyDeliverableAsset(asset: DeliverableAssetRow): boolean {
  if (asset.processingState !== 'READY') return false;
  if (asset.storageKey.length === 0) return false;
  if (PRIVATE_KINDS.includes(asset.kind)) return false;
  if (PRIVATE_ROLES.includes(asset.role)) return false;
  return true;
}

export async function findAssetForDelivery(
  db: CatalogDatabase,
  assetId: string,
): Promise<DeliverableAssetRow | null> {
  // Reject a malformed id before it reaches Postgres's uuid cast.
  if (!isAssetId(assetId)) return null;

  const result = await db.execute(sql`
    SELECT
      id,
      kind::text AS kind,
      role::text AS role,
      storage_key,
      processing_state::text AS processing_state
    FROM assets
    WHERE id = ${assetId}::uuid
      AND deleted_at IS NULL
    LIMIT 1
  `);
  const row = result.rows[0] as
    | {
        id: string;
        kind: string;
        role: string;
        storage_key: string | null;
        processing_state: string;
      }
    | undefined;
  if (row === undefined) return null;

  return {
    id: row.id,
    kind: row.kind,
    role: row.role,
    storageKey: row.storage_key ?? '',
    processingState: row.processing_state,
  };
}

