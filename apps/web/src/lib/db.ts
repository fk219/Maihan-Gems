/**
 * Database connection and repository factory for the storefront
 * Re-exports from @maihan/db to avoid direct postgres/drizzle dependencies in web
 */
import { createPool, createCatalogDatabase, StorefrontRepository } from '@maihan/db';

const databaseUrl = process.env['DATABASE_URL'] || process.env['NEXT_PUBLIC_DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = createPool(databaseUrl);
const db = createCatalogDatabase(pool) as any; // Cast to any for StorefrontRepository

let repoInstance: StorefrontRepository | null = null;

export function getStorefrontRepository(): StorefrontRepository {
  if (!repoInstance) {
    repoInstance = new StorefrontRepository(db);
  }
  return repoInstance;
}

export { db, pool };
