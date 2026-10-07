/**
 * packages/db — DDL migration runner (Phase 1 Task 4; library surface added in
 * Task 5 so the schema-fidelity orchestrator can migrate a fresh scratch
 * database without duplicating the runner).
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
 *     with the migrationsFolder option or MAIHAN_MIGRATIONS_DIR).
 *   - Drizzle's migrator wraps the whole pending set in ONE transaction: a
 *     failure rolls everything back and records nothing, so the schema is
 *     recoverable and no failed migration is ever marked applied. History is
 *     kept in drizzle.__drizzle_migrations, which keeps the public schema
 *     exactly equal to the locked 74-table inventory.
 *   - Re-running is a no-op once every migration is recorded.
 *
 * As a CLI (`node dist/migrate.js`) it targets DATABASE_URL and refuses any
 * database outside the maihan_dev* dev contract.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { Client } = pg;

const MIGRATION_LOCK_KEY = 'maihan-gems-ddl-migrations';

/** The migrations folder: packages/db/migrations next to the compiled dist/. */
export function defaultMigrationsFolder(): string {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
}

export interface RunMigrationsOptions {
  /** The single sanctioned database variable (Source of Truth 29.6). */
  databaseUrl: string;
  /** Defaults to packages/db/migrations; overridable for verification runs. */
  migrationsFolder?: string;
}

export interface RunMigrationsResult {
  database: string;
  postgres_version_short: string;
  /** Rows now in drizzle.__drizzle_migrations. */
  recorded: number;
}

export async function runMigrations(options: RunMigrationsOptions): Promise<RunMigrationsResult> {
  const { databaseUrl } = options;
  if (!databaseUrl || databaseUrl.length === 0) {
    throw new Error('DATABASE_URL is not set. It is the single sanctioned database variable (Source of Truth 29.6).');
  }
  const migrationsFolder = options.migrationsFolder ?? process.env['MAIHAN_MIGRATIONS_DIR'] ?? defaultMigrationsFolder();

  // doc 29 section 4: migrations belong on a direct connection. The Neon
  // pooled endpoint uses transaction-mode pooling, where session-level
  // advisory locks cannot be held. Never print the URL itself.
  let host: string | undefined;
  try {
    host = new URL(databaseUrl).host;
  } catch {
    throw new Error('DATABASE_URL is not a valid URL.');
  }
  if (host?.includes('-pooler.')) {
    process.stderr.write(
      'migrate: WARNING: DATABASE_URL points at a pooled endpoint; doc 29 section 4 requires migrations on the direct endpoint (session advisory locks do not survive transaction-mode pooling).\n',
    );
  }

  // Dedicated client for the advisory lock so the lock and the migration
  // transaction share one session on a direct connection.
  const lockClient = new Client({ connectionString: databaseUrl });
  await lockClient.connect();
  try {
    await lockClient.query('SELECT pg_advisory_lock(hashtext($1))', [MIGRATION_LOCK_KEY]);
  } catch (error) {
    await lockClient.end().catch(() => undefined);
    throw new Error(
      `could not acquire the migration advisory lock: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const db = drizzle({ client: lockClient });
  try {
    const target = await lockClient.query<{ version: string; db: string; schema: string }>(
      'SELECT version() AS version, current_database() AS db, current_schema() AS schema',
    );
    const row = target.rows[0];
    if (!row) throw new Error('target database did not answer the identity probe');
    if (!row.db.startsWith('maihan_dev')) {
      throw new Error(`refusing to migrate: current_database() is "${row.db}", the dev contract is maihan_dev (Task 2)`);
    }
    process.stdout.write(`migrate: target ${row.db} on ${row.version.split(',')[0]}\n`);

    await migrate(db, { migrationsFolder });
    const applied = await lockClient.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations',
    );
    const recorded = Number(applied.rows[0]?.count ?? 0);
    process.stdout.write(`migrate: complete; ${recorded} migration(s) recorded in history\n`);
    return {
      database: row.db,
      postgres_version_short: row.version.split(' ').slice(0, 2).join(' '),
      recorded,
    };
  } finally {
    try {
      await lockClient.query('SELECT pg_advisory_unlock(hashtext($1))', [MIGRATION_LOCK_KEY]);
    } finally {
      await lockClient.end().catch(() => undefined);
    }
  }
}

// CLI entry point: only when this module is the executed script. The library
// export above must never trigger a migration run on import.
const isDirectExecution =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  runMigrations({ databaseUrl: process.env['DATABASE_URL'] ?? '' }).catch((error: unknown) => {
    process.stderr.write(`migrate: FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
