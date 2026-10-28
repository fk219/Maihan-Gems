import pg from 'pg';

export const DATABASE_URL = process.env.DATABASE_URL ?? '';
export const PORT = Number(process.env.FRESH_API_PORT ?? 3010);
export const HOST = process.env.FRESH_API_HOST ?? '127.0.0.1';   // localhost-only dev service
export const ADMIN_TOKEN = process.env.FRESH_ADMIN_TOKEN ?? '';

if (!DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is required');
  process.exit(2);
}
if (!ADMIN_TOKEN) {
  console.error('FATAL: FRESH_ADMIN_TOKEN is required (dev bearer token for admin routes)');
  process.exit(2);
}

export const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 });

export type Db = pg.PoolClient;
export type AnyClient = pg.Pool | pg.PoolClient;

export async function withTx<T>(fn: (client: Db) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function audit(
  client: Db | pg.Pool,
  action: string,
  entityKind: string,
  entityId: number | null,
  after: unknown,
  actor = 'admin',
): Promise<void> {
  await client.query(
    `INSERT INTO fresh.audit_log (actor_kind, actor_id, action, entity_kind, entity_id, after)
     VALUES ($1, NULL, $2, $3, $4, $5::jsonb)`,
    [actor, action, entityKind, entityId, JSON.stringify(after ?? null)],
  );
}
