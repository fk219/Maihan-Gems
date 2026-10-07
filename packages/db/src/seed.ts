/**
 * packages/db — reference-data seed CLI (Phase 1 Task 9).
 *
 *   node dist/seed.js            (or pnpm --filter @maihan/db run seed)
 *
 * Seeds the authoritative reference vocabulary on whatever database the
 * single sanctioned DATABASE_URL (SoT 29.6) names, then reports the counts.
 * Idempotent: safe to rerun; a second run inserts nothing.
 *
 * Mirrors the migration runner's guards: the dev contract (database
 * maihan_dev), and the direct-endpoint warning. Production hosts are never a
 * dev target (AGENTS.md section 6).
 */
import pg from 'pg';
import { pathToFileURL } from 'node:url';
import { seedReferenceData } from './seed/reference-seed.js';

const { Client } = pg;

async function runSeed(databaseUrl: string): Promise<void> {
  if (!databaseUrl || databaseUrl.length === 0) {
    process.stderr.write('seed: DATABASE_URL is not set. It is the single sanctioned database variable (Source of Truth 29.6).\n');
    process.exitCode = 1;
    return;
  }
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const who = await client.query<{ version: string; db: string }>(
      'SELECT version() AS version, current_database() AS db',
    );
    const row = who.rows[0];
    if (!row) throw new Error('target database did not answer the identity probe');
    if (!row.db.startsWith('maihan_dev')) {
      throw new Error(`refusing to seed: current_database() is "${row.db}", the dev contract is maihan_dev (Task 2)`);
    }
    process.stdout.write(`seed: target ${row.db} on ${row.version.split(',')[0]}\n`);

    const counts = await seedReferenceData(client);
    process.stdout.write(
      `seed: complete — metals ${counts.metals.inserted} inserted / ${counts.metals.present} present, ` +
        `jewellery_types ${counts.jewelleryTypes.inserted}/${counts.jewelleryTypes.present}, ` +
        `setting_styles ${counts.settingStyles.inserted}/${counts.settingStyles.present}, ` +
        `treatments ${counts.treatments.inserted}/${counts.treatments.present}, ` +
        `treatment_labels ${counts.treatmentLabels.inserted}/${counts.treatmentLabels.present}, ` +
        `colour_intensities ${counts.colourIntensities.inserted}/${counts.colourIntensities.present}, ` +
        `clarities ${counts.clarities.inserted}/${counts.clarities.present}, ` +
        `clarity_labels ${counts.clarityLabels.inserted}/${counts.clarityLabels.present}\n`,
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}

const isDirectExecution =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  runSeed(process.env['DATABASE_URL'] ?? '').catch((error: unknown) => {
    process.stderr.write(`seed: FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
