/**
 * packages/db — schema verification CLI (Phase 1 Task 4 validation).
 *
 * Read-only PostgreSQL catalog introspection against the single sanctioned
 * DATABASE_URL. Prints a machine-comparable JSON inventory of the migrated
 * schema so the local PostgreSQL 16 and the Neon dev database can be diffed
 * (Task 4 requirement: schema fidelity, local vs Neon).
 *
 * Authority: technical_design/04 "Validation rules"; INITIAL_IMPLEMENTATION_
 * PLAN.md section 8 (acceptance criteria). This script reports facts; it
 * asserts nothing about business data (there is none — Task 4 is DDL only).
 *
 * Since Task 5 the introspection queries live in introspect.ts, shared with
 * assert-schema.ts, so both consumers use identical counting semantics.
 *
 * Never prints connection material. DATABASE_URL comes from the environment.
 */
import pg from 'pg';
import { introspectSchema } from './introspect.js';

const { Client } = pg;

async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl || databaseUrl.length === 0) {
    process.stderr.write('verify-schema: DATABASE_URL is not set\n');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const report = await introspectSchema(client);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`verify-schema: FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
