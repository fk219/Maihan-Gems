/**
 * packages/db — DDL migration runner (Phase 1 Task 4).
 *
 * Authority:
 *   technical_design/02  "Tooling by activity" — schema migrations are applied
 *     with Drizzle (Drizzle Kit authors, the Drizzle migrator applies) inside
 *     packages/db. tools/migrate is the Phase 2 DATA pipeline (doc 33) and is
 *     a different tool entirely.
 *   technical_design/04  "Migration ordering" — 17 forward-only migrations,
 *     one logical unit per Source of Truth section 8 subsection.
 *   technical_design/29  section 4 — migrations are forward-only and run as a
 *     single serialised job; concurrent attempts are blocked by an advisory
 *     lock, and migrations run on a small direct-connection pool (not the
 *     serverless pooled endpoint).
 *   Source of Truth 29.6 — DATABASE_URL is the single sanctioned database
 *     variable. It is read from the environment and never logged.
 *
 * Behaviour:
 *   - Applies every pending migration from ./migrations (override the folder
 *     with MAIHAN_MIGRATIONS_DIR for verification runs only).
 *   - Drizzle's migrator wraps the whole pending set in ONE transaction: a
 *     failure rolls everything back and records nothing, so the schema is
 *     recoverable and no failed migration is ever marked applied. History is
 *     kept in drizzle.__drizzle_migrations, which keeps the public schema
 *     exactly equal to the locked 74-table inventory.
 *   - Re-running is a no-op once every migration is recorded.
 *
 * This file is intentionally self-contained (no relative imports) so the
 * compiled dist/migrate.js runs under plain Node ESM.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Client } = pg;

const MIGRATION_LOCK_KEY = 'maihan-gems-ddl-migrations';

function fail(message: string): never {
  process.stderr.write(`migrate: ${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl || databaseUrl.length === 0) {
    fail('DATABASE_URL is not set. It is the single sanctioned database variable (Source of Truth 29.6).');
  }

  // doc 29 section 4: migrations belong on a direct connection. The Neon
  // pooled endpoint uses transaction-mode pooling, where session-level
  // advisory locks cannot be held. Never print the URL itself.
  let host: string | undefined;
  try {
    host = new URL(databaseUrl).host;
  } catch {
    fail('DATABASE_URL is not a valid URL.');
  }
  if (host?.includes('-pooler.')) {
    process.stderr.write(
      'migrate: WARNING: DATABASE_URL points at a pooled endpoint; doc 29 section 4 requires migrations on the direct endpoint (session advisory locks do not survive transaction-mode pooling).\n',
    );
  }

  const defaultFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
  const migrationsFolder = process.env['MAIHAN_MIGRATIONS_DIR'] ?? defaultFolder;

  // Dedicated client for the advisory lock so the lock and the migration
  // transaction share one session on a direct connection.
  const lockClient = new Client({ connectionString: databaseUrl });
  await lockClient.connect();
  try {
    await lockClient.query('SELECT pg_advisory_lock(hashtext($1))', [MIGRATION_LOCK_KEY]);
  } catch (error) {
    await lockClient.end().catch(() => undefined);
    fail(`could not acquire the migration advisory lock: ${error instanceof Error ? error.message : String(error)}`);
  }

  const db = drizzle({ client: lockClient });
  try {
    const target = await lockClient.query<{ version: string; db: string; schema: string }>(
      'SELECT version() AS version, current_database() AS db, current_schema() AS schema',
    );
    const row = target.rows[0];
    if (!row) fail('target database did not answer the identity probe');
    if (!row.db.startsWith('maihan_dev')) {
      fail(`refusing to migrate: current_database() is "${row.db}", the dev contract is maihan_dev (Task 2)`);
    }
    process.stdout.write(`migrate: target ${row.db} on ${row.version.split(',')[0]}\n`);

    await migrate(db, { migrationsFolder });
    const applied = await lockClient.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations',
    );
    process.stdout.write(`migrate: complete; ${applied.rows[0]?.count ?? '?'} migration(s) recorded in history\n`);
  } finally {
    try {
      await lockClient.query('SELECT pg_advisory_unlock(hashtext($1))', [MIGRATION_LOCK_KEY]);
    } finally {
      await lockClient.end().catch(() => undefined);
    }
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`migrate: FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
