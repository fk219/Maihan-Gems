/**
 * apps/worker/src/dispatch/catalog-db.ts
 *
 * The worker's database executor. Same shape as packages/db's read executor
 * (a Drizzle NodePgDatabase over the shared pool) so the worker can call
 * packages/db repositories directly. SQL text is composed exclusively
 * through Drizzle's `sql` template — every dynamic value is a parameter.
 */
import { createCatalogDatabase as createExecutor, type CatalogDatabase } from '@maihan/db';
import type { Pool } from '@maihan/db';

export type { CatalogDatabase };

export function createCatalogDatabase(pool: Pool): CatalogDatabase {
  return createExecutor(pool);
}
