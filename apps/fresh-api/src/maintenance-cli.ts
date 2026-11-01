/** Run the maintenance sweep once (cron/worker entrypoint). */
import { pool } from './db.js';
import { sweepMaintenance } from './maintenance.js';

if (!process.env['DATABASE_URL']) {
  console.error('FATAL: DATABASE_URL is required');
  process.exit(2);
}

console.log(JSON.stringify(await sweepMaintenance()));
await pool.end();
