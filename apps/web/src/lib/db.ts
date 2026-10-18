/**
 * Database connection and repository factory for the storefront
 * Re-exports from @maihan/db to avoid direct postgres/drizzle dependencies in web
 *
 * The pool is created LAZILY: module evaluation must never throw (Next.js
 * collects page data at build time, and a build machine has no DATABASE_URL
 * — a module-level throw breaks `next build` hermetically). The first actual
 * repository call opens the pool; a missing URL fails there, loudly.
 */
import { createPool, createCatalogDatabase, SimpleStorefrontRepository } from '@maihan/db';

const databaseUrl = process.env['DATABASE_URL'] || process.env['NEXT_PUBLIC_DATABASE_URL'] || '';

const globalStore = globalThis as unknown as {
  __maihanStorefrontPool?: ReturnType<typeof createPool>;
  __maihanStorefrontRepo?: SimpleStorefrontRepository;
};

export function getPool(): ReturnType<typeof createPool> {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  if (!globalStore.__maihanStorefrontPool) {
    globalStore.__maihanStorefrontPool = createPool(databaseUrl);
  }
  return globalStore.__maihanStorefrontPool;
}

export function getStorefrontRepository(): SimpleStorefrontRepository {
  if (!globalStore.__maihanStorefrontRepo) {
    globalStore.__maihanStorefrontRepo = new SimpleStorefrontRepository(getPool() as never);
  }
  return globalStore.__maihanStorefrontRepo;
}

export function getDb(): ReturnType<typeof createCatalogDatabase> {
  return createCatalogDatabase(getPool());
}

export const db = {
  get raw(): ReturnType<typeof createCatalogDatabase> {
    return getDb();
  },
};
export const pool = {
  get raw(): ReturnType<typeof createPool> {
    return getPool();
  },
};
