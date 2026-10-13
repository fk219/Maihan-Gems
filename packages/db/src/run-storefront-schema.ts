/**
 * Applies storefront DDL (0019 + 0020) outside the locked catalog migration chain.
 *
 * Catalog migration 0005 already defines a different `products` table, so 0019
 * cannot run through `migrate.js` on the same database. Storefront UI dev uses
 * this script on a fresh local volume instead of the full migrator.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import pg from 'pg';

const { Client } = pg;

const STOREFRONT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'storefront-migrations');

const FILES = ['0019_storefront_schema.sql', '0020_media_provenance.sql', '0021_ngc_research_schema.sql'] as const;

async function hasStorefrontProducts(client: pg.Client): Promise<boolean> {
  const result = await client.query<{ ok: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'vendor_id'
    ) AS ok
  `);
  return result.rows[0]?.ok === true;
}

async function hasCatalogProducts(client: pg.Client): Promise<boolean> {
  const result = await client.query<{ ok: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'product_number'
    ) AS ok
  `);
  return result.rows[0]?.ok === true;
}

async function runSqlFile(client: pg.Client, fileName: string): Promise<void> {
  const filePath = path.join(STOREFRONT_DIR, fileName);
  const sql = fs.readFileSync(filePath, 'utf8');
  await client.query(sql);
}

export async function runStorefrontSchema(databaseUrl: string): Promise<{ applied: boolean }> {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set.');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const db = await client.query<{ db: string }>('SELECT current_database() AS db');
    const name = db.rows[0]?.db ?? '';
    if (!name.startsWith('maihan_dev')) {
      throw new Error(`refusing storefront schema: current_database() is "${name}", expected maihan_dev*`);
    }

    if (await hasStorefrontProducts(client)) {
      process.stdout.write('storefront-schema: already applied (products.vendor_id present)\n');
      await runSqlFile(client, '0020_media_provenance.sql').catch(() => undefined);
      process.stdout.write('storefront-schema: applying 0021_ngc_research_schema.sql\n');
      await runSqlFile(client, '0021_ngc_research_schema.sql');
      return { applied: false };
    }

    if (await hasCatalogProducts(client)) {
      throw new Error(
        'storefront-schema: catalog migration 0005 products table is present. Reset the local DB: docker compose down -v && docker compose up -d',
      );
    }

    for (const file of FILES) {
      process.stdout.write(`storefront-schema: applying ${file}\n`);
      await runSqlFile(client, file);
    }
    process.stdout.write('storefront-schema: complete\n');
    return { applied: true };
  } finally {
    await client.end().catch(() => undefined);
  }
}

const isDirectExecution =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  runStorefrontSchema(process.env['DATABASE_URL'] ?? '').catch((error: unknown) => {
    process.stderr.write(`storefront-schema: FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
