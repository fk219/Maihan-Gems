/**
 * packages/db/src/pool.ts
 *
 * The one place a connection pool is created. The API composition root
 * (apps/web) may not import the `pg` driver (technical_design/03 forbidden
 * imports, enforced by ESLint) — it calls THIS factory and passes the opaque
 * pool to `createCatalogDatabase(pool)` / `createCatalogQueryPort(db)`.
 *
 * Pool discipline: small, localhost/dev sized; a cache or HTTP concern must
 * never reach into the pool (Redis is not this package's business).
 */
import { Pool } from 'pg';

export interface CreatePoolOptions {
  /** Max clients (default 10 — the API process is read-only and small). */
  max?: number;
  /** Statement timeout in ms; catalogue reads are indexed and short (default 5s). */
  statementTimeoutMs?: number;
}

export function createPool(databaseUrl: string, options: CreatePoolOptions = {}): Pool {
  return new Pool({
    connectionString: databaseUrl,
    max: options.max ?? 10,
    statement_timeout: options.statementTimeoutMs ?? 5000,
    ssl: false, // Disable SSL for local development
  });
}
