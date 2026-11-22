/**
 * packages/db/src/cli/backfill-assets.ts
 *
 * Track A4 — `assets:backfill`, the operator entry point.
 *
 * This file is wiring only: configuration in, one `runAssetBackfill` call,
 * a machine-readable report out. The decisions live in `media/backfill.ts`
 * and the SQL lives in `media/assets-repository.ts`, so both can be tested
 * without a process, a database or a bucket.
 *
 * Configuration (environment; secrets are never printed):
 *
 *   DATABASE_URL              required
 *   MEDIA_DRIVER              local | s3   (default: s3 when R2_ENDPOINT is set)
 *   MEDIA_ROOT                local driver root (default: ./.media)
 *   MEDIA_PUBLIC_BASE_URL     public CDN origin for the s3 driver
 *   R2_ENDPOINT               S3 API origin
 *   R2_BUCKET                 bucket name
 *   R2_REGION                 default: auto
 *   R2_ACCESS_KEY_ID          credential
 *   R2_SECRET_ACCESS_KEY      credential
 *   BACKFILL_LIMIT            max rows considered this run (default 100)
 *   BACKFILL_RETRY_LIMIT      failures before RETRY_LIMIT (default 3)
 *
 * Exit codes: 0 = the run completed (including per-asset failures, which are
 * counted and retried next run); 2 = configuration or wiring failure.
 * A completed run always reports `stateCounts`, the census of every
 * non-deleted asset, so no row is unaccounted for.
 *
 * `process.env` is read HERE and nowhere else in the media stack. This is an
 * operator CLI, of the same shape as `tools/migrate/src/cli.ts`; it is not
 * imported by a runtime application.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createCatalogDatabase } from '../catalog/executor.js';
import { createPool } from '../pool.js';
import {
  fetchAssetBytes,
  runAssetBackfill,
  type BackfillRunReport,
  DEFAULT_BACKFILL_LIMIT,
  DEFAULT_RETRY_LIMIT,
} from '../media/backfill.js';
import { createAssetsBackfillStore } from '../media/assets-repository.js';
import { LocalDiskStorage, type ObjectStorage } from '../media/storage.js';
import { S3CompatibleStorage, S3StorageConfigError } from '../media/s3.js';

export type BackfillDriver = 'local' | 's3';

export interface BackfillCliEnv {
  readonly DATABASE_URL?: string;
  readonly MEDIA_DRIVER?: string;
  readonly MEDIA_ROOT?: string;
  readonly MEDIA_PUBLIC_BASE_URL?: string;
  readonly R2_ENDPOINT?: string;
  readonly R2_BUCKET?: string;
  readonly R2_REGION?: string;
  readonly R2_ACCESS_KEY_ID?: string;
  readonly R2_SECRET_ACCESS_KEY?: string;
  readonly BACKFILL_LIMIT?: string;
  readonly BACKFILL_RETRY_LIMIT?: string;
}

export class BackfillCliConfigError extends Error {
  constructor(variable: string, reason: string) {
    super(`[BACKFILL_CONFIG] ${variable}: ${reason}`);
    this.name = 'BackfillCliConfigError';
  }
}

export interface BackfillCliConfig {
  readonly databaseUrl: string;
  readonly driver: BackfillDriver;
  readonly provider: string;
  readonly storage: ObjectStorage;
  readonly limit: number;
  readonly retryLimit: number;
}

function required(env: BackfillCliEnv, name: keyof BackfillCliEnv): string {
  const value = env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new BackfillCliConfigError(name, 'required but not set');
  }
  return value;
}

function positiveInteger(raw: string | undefined, variable: string, fallback: number, max: number): number {
  if (raw === undefined || raw.trim().length === 0) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new BackfillCliConfigError(variable, `must be an integer between 1 and ${max}`);
  }
  return value;
}

function resolveDriver(env: BackfillCliEnv): BackfillDriver {
  const declared = env.MEDIA_DRIVER?.trim().toLowerCase();
  if (declared === 'local' || declared === 's3') return declared;
  if (declared !== undefined && declared.length > 0) {
    throw new BackfillCliConfigError('MEDIA_DRIVER', 'must be "local" or "s3"');
  }
  return (env.R2_ENDPOINT?.trim().length ?? 0) > 0 ? 's3' : 'local';
}

/**
 * Resolve configuration and construct the driver. Constructors validate;
 * no network call is made here.
 */
export function resolveBackfillCliConfig(env: BackfillCliEnv): BackfillCliConfig {
  const databaseUrl = required(env, 'DATABASE_URL');
  const driver = resolveDriver(env);
  const limit = positiveInteger(env.BACKFILL_LIMIT, 'BACKFILL_LIMIT', DEFAULT_BACKFILL_LIMIT, 10_000);
  const retryLimit = positiveInteger(
    env.BACKFILL_RETRY_LIMIT,
    'BACKFILL_RETRY_LIMIT',
    DEFAULT_RETRY_LIMIT,
    20,
  );

  if (driver === 'local') {
    const root = resolve(env.MEDIA_ROOT?.trim() || '.media');
    return { databaseUrl, driver, provider: 'local', storage: new LocalDiskStorage(root), limit, retryLimit };
  }

  const endpoint = required(env, 'R2_ENDPOINT');
  const bucket = required(env, 'R2_BUCKET');
  const accessKeyId = required(env, 'R2_ACCESS_KEY_ID');
  const secretAccessKey = required(env, 'R2_SECRET_ACCESS_KEY');
  const publicBaseUrl = required(env, 'MEDIA_PUBLIC_BASE_URL');
  const region = env.R2_REGION?.trim() || 'auto';

  let storage: S3CompatibleStorage;
  try {
    storage = new S3CompatibleStorage({
      endpoint,
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      publicBaseUrl,
    });
  } catch (error) {
    if (error instanceof S3StorageConfigError) {
      throw new BackfillCliConfigError('R2_*', error.message);
    }
    throw error;
  }

  return {
    databaseUrl,
    driver,
    provider: endpoint.includes('r2.cloudflarestorage.com') ? 'r2' : 's3',
    storage,
    limit,
    retryLimit,
  };
}

function writeLine(text: string): void {
  process.stdout.write(`${text}\n`);
}

/** Run the backfill once and print the report. Returns the process exit code. */
export async function main(env: BackfillCliEnv = process.env): Promise<number> {
  let config: BackfillCliConfig;
  try {
    config = resolveBackfillCliConfig(env);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'configuration failed';
    writeLine(JSON.stringify({ ok: false, code: 'CONFIG', message }));
    return 2;
  }

  const pool = createPool(config.databaseUrl, { max: 2, statementTimeoutMs: 30_000 });
  try {
    const db = createCatalogDatabase(pool);
    const store = createAssetsBackfillStore(db);
    const report: BackfillRunReport = await runAssetBackfill(
      { store, storage: config.storage, fetchBytes: fetchAssetBytes },
      { limit: config.limit, retryLimit: config.retryLimit, provider: config.provider },
    );

    writeLine(
      JSON.stringify(
        {
          ok: true,
          driver: config.driver,
          provider: config.provider,
          limit: config.limit,
          retryLimit: config.retryLimit,
          fetched: report.fetched,
          ready: report.ready,
          skipped: report.skipped,
          failed: report.failed,
          deferred: report.deferred,
          stateCounts: report.stateCounts,
          items: report.items,
        },
        null,
        2,
      ),
    );
    return 0;
  } catch (error) {
    // Message is a state/transport failure, never a credential: the drivers
    // and the repository do not put secrets in error text.
    const message = error instanceof Error ? error.message : 'backfill failed';
    writeLine(JSON.stringify({ ok: false, code: 'BACKFILL_FAILED', message }));
    return 1;
  } finally {
    await pool.end();
  }
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  void main().then((code) => {
    process.exitCode = code;
  });
}
