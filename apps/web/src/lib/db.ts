/**
 * Database connection and repository factory for the storefront
 * Re-exports from @maihan/db to avoid direct postgres/drizzle dependencies in web
 */
import { createPool, createCatalogDatabase, SimpleStorefrontRepository } from '@maihan/db';

const databaseUrl = process.env['DATABASE_URL'] || process.env['NEXT_PUBLIC_DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = createPool(databaseUrl);
const db = createCatalogDatabase(pool) as any;

let repoInstance: SimpleStorefrontRepository | null = null;

export function getStorefrontRepository(): SimpleStorefrontRepository {
  if (!repoInstance) {
    repoInstance = new SimpleStorefrontRepository(db);
  }
  return repoInstance;
}

export { db, pool };
