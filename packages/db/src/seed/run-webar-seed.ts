#!/usr/bin/env node
/**
 * packages/db/src/seed/run-webar-seed.ts
 *
 * Registers the procedural gem GLBs (P2-9 first tranche) as READY WebAR
 * assets. Idempotent: existing storage keys are skipped.
 *
 *   pnpm --filter @maihan/db run seed:webar
 */
import pg from 'pg';
import { seedWebarAssets } from './webar-seed.js';

const databaseUrl = process.env['DATABASE_URL'] ?? '';
if (!databaseUrl) {
  console.error('seed:webar: DATABASE_URL is required.');
  process.exit(1);
}

async function main(): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const result = await seedWebarAssets(pool, { webRoot: process.cwd() });
    console.log(`seed:webar: created ${result.created}, skipped ${result.skipped} (existing or missing files)`);
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
