/**
 * Drain QUEUED transactional email through the configured provider.
 * Run on a schedule (cron/worker) once RESEND_API_KEY is set:
 *   pnpm --filter @maihan/fresh-api run mail:drain
 */
import { pool } from './db.js';
import { dispatchOutbox } from './mail.js';

if (!process.env['DATABASE_URL']) {
  console.error('FATAL: DATABASE_URL is required');
  process.exit(2);
}

const result = await dispatchOutbox(pool as never, Number(process.env['OUTBOX_LIMIT'] ?? 50));
console.log(JSON.stringify(result));
await pool.end();
