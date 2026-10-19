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
  /** Explicit SSL override; otherwise derived from databaseUrl (sslmode=require / Neon). */
  ssl?: boolean | { rejectUnauthorized: boolean };
}

function resolvePoolSsl(
  databaseUrl: string,
  explicit?: boolean | { rejectUnauthorized: boolean },
): boolean | { rejectUnauthorized: boolean } {
  if (explicit !== undefined) return explicit;
  const lower = databaseUrl.toLowerCase();
  if (
    lower.includes('sslmode=require') ||
    lower.includes('sslmode=verify') ||
    lower.includes('ssl=true') ||
    lower.includes('.neon.tech')
  ) {
    return { rejectUnauthorized: false };
  }
  return false;
}

export function createPool(databaseUrl: string, options: CreatePoolOptions = {}): Pool {
  return new Pool({
    connectionString: databaseUrl,
    max: options.max ?? 10,
    statement_timeout: options.statementTimeoutMs ?? 5000,
    ssl: resolvePoolSsl(databaseUrl, options.ssl),
  });
}
