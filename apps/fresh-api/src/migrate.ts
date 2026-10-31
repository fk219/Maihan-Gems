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
import path from 'node:path';
import pg from 'pg';

const DIR = path.resolve(import.meta.dirname, '../../../docs/fresh-schema');
const URL = process.env.DATABASE_URL;

if (!URL) {
  console.error('FATAL: DATABASE_URL is required');
  process.exit(1);
}

const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b));

if (!files.length) {
  console.error(`FATAL: no .sql files in ${DIR}`);
  process.exit(1);
}

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

  const { rows } = await client.query<{ version: string }>('SELECT version FROM fresh.schema_migrations');
  const applied = new Set(rows.map((r) => r.version));

  if (applied.size === 0) {
    const { rows: base } = await client.query<{ t: string | null }>(
      `SELECT to_regclass('fresh.gemstone_families')::text AS t`,
    );
    if (base[0]?.t) {
      for (const f of files) {
        await client.query('INSERT INTO fresh.schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING', [f]);
      }
      console.log(`baseline: schema already present — recorded ${files.length} file(s) as applied`);
      process.exit(0);
    }
  }

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(DIR, file), 'utf8');
    const selfManaged = /^\s*BEGIN\s*;/im.test(sql);
    process.stdout.write(`apply ${file} … `);
    try {
      if (!selfManaged) await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO fresh.schema_migrations (version) VALUES ($1)', [file]);
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
