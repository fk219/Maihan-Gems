/**
 * packages/db/src/catalog/executor.ts
 *
 * The catalogue read executor.
 *
 * technical_design/04 rule: repositories run inside an ambient transaction
 * supplied by the caller — for READS no transaction is opened anywhere; the
 * executor is a plain Drizzle `NodePgDatabase` over a caller-provided pool.
 *
 * SQL text is composed EXCLUSIVELY through Drizzle's `sql` template
 * (`packages/db` owns queries, technical_design/03): every dynamic value is
 * a parameter, never an interpolated string. The only raw fragments are
 * fixed identifiers/enum literals taken from closed whitelists in this
 * package (sort columns, directions) — never from caller input.
 *
 * Rows never leave this package raw; mappers in this folder turn them into
 * contract-validated DTOs.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

export type CatalogDatabase = NodePgDatabase<Record<string, never>>;

export function createCatalogDatabase(pool: Pool): CatalogDatabase {
  return drizzle(pool) as unknown as CatalogDatabase;
}
