/** CLI runner: seeds the compiled NGC research catalogue into the locked schema. */
import pg from 'pg';

import { seedCatalogue } from './catalogue-seed.js';

async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'] ?? '';
  if (!databaseUrl) {
    process.stderr.write('catalogue-seed: DATABASE_URL is not set\n');
    process.exitCode = 1;
    return;
  }
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    const counts = await seedCatalogue(client);
    process.stdout.write(
      `catalogue-seed: complete — batch ${counts.importBatch}, species ${counts.species}, varieties ${counts.varieties}, ` +
      `colours ${counts.colours}, origins ${counts.origins}, gemstones ${counts.gemstones} (${counts.gemstoneStones} stones), ` +
      `settings ${counts.settings} (${counts.settingVariants} variants, ${counts.compatibilityRules} rules), ` +
      `products ${counts.products}, assets ${counts.assets} (${counts.assetUsages} usages), ` +
      `certificates ${counts.certificates}, pages ${counts.pages}, discounts ${counts.discounts}, addons ${counts.addons}\n`,
    );
  } finally {
    client.release();
    await pool.end().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`catalogue-seed: FAILED: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
