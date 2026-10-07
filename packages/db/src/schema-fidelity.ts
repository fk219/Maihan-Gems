/**
 * packages/db — schema-fidelity CI orchestrator (Phase 1 Task 5).
 *
 * INITIAL_IMPLEMENTATION_PLAN.md section 36 task 5 — the blocking CI check:
 *
 *   1. provision a FRESH PostgreSQL 16 test database,
 *   2. apply the complete ordered migration chain from zero,
 *   3. run the schema-fidelity assertion (assert-schema.ts),
 *   4. exit non-zero on any mismatch,
 *   5. always clean up the temporary database.
 *
 * The fresh database is a scratch database (maihan_dev_fidelity) on the
 * PostgreSQL server that DATABASE_URL points at. DATABASE_URL remains the
 * single sanctioned database variable (Source of Truth 29.6); per-environment
 * selection is a property of the VALUE stored in it, never of the variable
 * name. In CI the value is the disposable local compose instance; the shared
 * Neon development database is never touched by this command — a Neon host is
 * refused outright, which also covers production.
 *
 * The DATABASE_URL database itself is never migrated or dropped here; only the
 * scratch database is created and destroyed.
 *
 * Framework-free (ADR-021 remains open). Deterministic: the same chain on a
 * fresh database yields the same verdict.
 */
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { runMigrations, defaultMigrationsFolder } from './migrate.js';
import { introspectSchema } from './introspect.js';
import { assertSchemaFidelity } from './assert-schema.js';

const { Client } = pg;

const SCRATCH_DATABASE = 'maihan_dev_fidelity';

function fail(message: string): never {
  process.stderr.write(`schema-fidelity: ${message}\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl || databaseUrl.length === 0) {
    fail('DATABASE_URL is not set. It is the single sanctioned database variable (Source of Truth 29.6).');
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    fail('DATABASE_URL is not a valid URL.');
  }

  // Guard: never provision or drop anything on the shared Neon development
  // database or on production. Both are Neon hosts. Run this against the
  // disposable local PostgreSQL 16 (compose.yaml) only.
  if (parsed.host.endsWith('.neon.tech')) {
    fail(
      'refusing to run: DATABASE_URL points at a Neon host. The schema-fidelity run requires a disposable fresh database; point DATABASE_URL at the local PostgreSQL 16 (compose.yaml) for this check. The shared dev database and production are never touched.',
    );
  }

  // Admin connection: same server and credential, database "postgres", used
  // only to create and drop the scratch database. Never printed.
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const who = await admin.query<{ db: string }>('SELECT current_database() AS db');
    const adminDb = who.rows[0]?.db;
    if (adminDb !== 'postgres') {
      fail(`expected to connect to the "postgres" maintenance database for scratch lifecycle, got "${adminDb ?? '?'}"`);
    }

    // Deterministic scratch lifecycle: remove any leftover, then create fresh.
    await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH_DATABASE} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${SCRATCH_DATABASE}`);

    const scratchUrl = new URL(databaseUrl);
    scratchUrl.pathname = `/${SCRATCH_DATABASE}`;
    const migrationsFolder = defaultMigrationsFolder();
    const migrated = await runMigrations({ databaseUrl: scratchUrl.toString(), migrationsFolder });

    // The complete chain must have applied: history rows == journal entries.
    const journal = readFileSync(`${migrationsFolder}/meta/_journal.json`, 'utf8');
    const journalEntries = JSON.parse(journal).entries as unknown[];
    if (migrated.recorded !== journalEntries.length) {
      fail(`migration history on the fresh database has ${migrated.recorded} rows, expected ${journalEntries.length}`);
    }

    const scratch = new Client({ connectionString: scratchUrl.toString() });
    await scratch.connect();
    try {
      const report = await introspectSchema(scratch);
      const failures = assertSchemaFidelity(report);
      if (failures.length > 0) {
        process.stdout.write(`Schema fidelity FAILED on fresh database "${report.current_database}":\n`);
        for (const f of failures) process.stdout.write(`- ${f}\n`);
        process.exitCode = 1;
        return;
      }
      process.stdout.write(
        `Schema fidelity PASS on fresh database "${report.current_database}" (${migrated.recorded} migrations applied from zero)\n`,
      );
    } finally {
      await scratch.end().catch(() => undefined);
    }
  } finally {
    // Cleanup is unconditional: the scratch database never survives the run,
    // not even a failing one.
    try {
      await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH_DATABASE} WITH (FORCE)`);
    } finally {
      await admin.end().catch(() => undefined);
    }
  }
}

const isDirectExecution =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main().catch((error: unknown) => {
    process.stderr.write(`schema-fidelity: FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
