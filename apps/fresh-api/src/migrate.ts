/**
 * Fresh schema migration runner.
 *
 * Applies docs/fresh-schema/*.sql in filename order, each in its own
 * transaction, tracked in fresh.schema_migrations (version = filename).
 * Idempotent: already-applied versions are skipped.
 *
 * Baseline rule: if `fresh` already has tables but no schema_migrations table
 * (i.e. the schema was created before this runner existed), every file present
 * at that moment is recorded as applied. New files added later still run.
 *
 * Usage: DATABASE_URL=... pnpm --filter @maihan/fresh-api run migrate
 */
import { readdirSync, readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import pg from 'pg';

const DIR = path.resolve(import.meta.dirname, '../../../docs/fresh-schema');
const URL = process.env.DATABASE_URL;

if (!URL) {
  console.error('FATAL: DATABASE_URL is required');
  process.exit(1);
}

// Only numbered migration files: non-migration SQL (role templates etc.)
// lives outside docs/fresh-schema and must never be applied by this runner.
const files = readdirSync(DIR)
  .filter((f) => /^\d{4}_.*\.sql$/.test(f))
  .sort((a, b) => a.localeCompare(b));

if (!files.length) {
  console.error(`FATAL: no .sql files in ${DIR}`);
  process.exit(1);
}

export function fileChecksum(sql: string): string {
  return crypto.createHash('sha256').update(sql).digest('hex');
}

const ALLOW_DRIFT = process.argv.includes('--allow-drift');
const client = new pg.Client({ connectionString: URL });

try {
  await client.connect();
  await client.query('CREATE SCHEMA IF NOT EXISTS fresh');
  await client.query(
    `CREATE TABLE IF NOT EXISTS fresh.schema_migrations (
       version    text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
  await client.query(`ALTER TABLE fresh.schema_migrations ADD COLUMN IF NOT EXISTS checksum text`);

  const { rows } = await client.query<{ version: string; checksum: string | null }>(
    'SELECT version, checksum FROM fresh.schema_migrations',
  );
  const applied = new Map(rows.map((r) => [r.version, r.checksum]));

  // Backfill checksums recorded before integrity tracking existed.
  let drift = 0;
  for (const file of files) {
    if (!applied.has(file)) continue;
    const sql = readFileSync(path.join(DIR, file), 'utf8');
    const hash = fileChecksum(sql);
    const stored = applied.get(file);
    if (stored == null) {
      await client.query('UPDATE fresh.schema_migrations SET checksum = $2 WHERE version = $1', [file, hash]);
      applied.set(file, hash);
    } else if (stored !== hash) {
      drift += 1;
      console.error(`checksum drift: ${file} (recorded ${stored.slice(0, 12)}…, on disk ${hash.slice(0, 12)}…)`);
    }
  }
  if (drift > 0 && !ALLOW_DRIFT) {
    console.error(`FAILED: ${drift} applied migration file(s) changed. Restore the files or re-run with --allow-drift intentionally.`);
    await client.end();
    process.exit(1);
  }

  if (applied.size === 0) {
    const { rows: base } = await client.query<{ t: string | null }>(
      `SELECT to_regclass('fresh.gemstone_families')::text AS t`,
    );
    if (base[0]?.t) {
      for (const f of files) {
        const hash = fileChecksum(readFileSync(path.join(DIR, f), 'utf8'));
        await client.query(
          'INSERT INTO fresh.schema_migrations (version, checksum) VALUES ($1, $2) ON CONFLICT (version) DO UPDATE SET checksum = COALESCE(fresh.schema_migrations.checksum, EXCLUDED.checksum)',
          [f, hash],
        );
      }
      console.log(`baseline: schema already present — recorded ${files.length} file(s) as applied`);
      process.exit(0);
    }
  }

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(DIR, file), 'utf8');
    const checksum = fileChecksum(sql);
    const selfManaged = /^\s*BEGIN\s*;/im.test(sql);
    process.stdout.write(`apply ${file} … `);
    try {
      if (!selfManaged) await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO fresh.schema_migrations (version, checksum) VALUES ($1, $2)', [file, checksum]);
      if (!selfManaged) await client.query('COMMIT');
      console.log('ok');
      ran += 1;
    } catch (err) {
      if (!selfManaged) await client.query('ROLLBACK');
      console.error('FAILED');
      throw err;
    }
  }

  console.log(ran === 0 ? 'up to date — nothing to apply' : `applied ${ran} migration(s)`);
  await client.end();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
  await client.end().catch(() => {});
}
