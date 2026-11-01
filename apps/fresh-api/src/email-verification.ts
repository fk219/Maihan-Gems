/**
 * Customer email verification: hashed single-use tokens (24 h), queued as
 * transactional email. The raw token is returned only outside production so
 * local dev can complete the flow without a provider.
 */
import type { AnyClient } from './db.js';
import { newToken, hashKey } from './auth.js';
import { queueEmail, verificationEmail } from './mail.js';
import { log } from './logging.js';
import { StateError } from './validation.js';

const TTL_HOURS = 24;

export async function issueVerification(
  client: AnyClient,
  customerId: number,
  email: string,
): Promise<{ dev_token?: string }> {
  const t = newToken();
  await client.query(
    `INSERT INTO fresh.email_verifications (customer_id, token_hash, expires_at)
     VALUES ($1,$2, now() + interval '${TTL_HOURS} hours')`,
    [customerId, t.hash],
  );
  const mail = verificationEmail(t.raw);
  await queueEmail(client, { to: email, subject: mail.subject, body: mail.body });
  log('info', 'email verification issued', { customer_id: customerId });
  return process.env.MAIHAN_ENV !== 'production' ? { dev_token: t.raw } : {};
}

export async function verifyEmail(client: AnyClient, token: string): Promise<{ ok: true; email: string }> {
  const { rows } = await client.query(
    `SELECT ev.id, ev.customer_id, c.email
     FROM fresh.email_verifications ev
     JOIN fresh.customers c ON c.id = ev.customer_id
     WHERE ev.token_hash = $1 AND ev.used_at IS NULL AND ev.expires_at > now()`,
    [hashKey(token.trim())],
  );
  const row = rows[0];
  if (!row) throw new StateError('invalid or expired verification token');
  await client.query(`UPDATE fresh.email_verifications SET used_at = now() WHERE id = $1`, [row.id]);
  await client.query(`UPDATE fresh.customers SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1`, [row.customer_id]);
  log('info', 'email verified', { customer_id: Number(row.customer_id) });
  return { ok: true, email: String(row.email) };
}
