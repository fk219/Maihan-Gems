import crypto from 'node:crypto';
import type { AnyClient } from './db.js';

// password hashing — scrypt (memory-hard), format: scrypt$N$r$p$salt$hash
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const N = 16384, r = 8, p = 1;
  const hash = crypto.scryptSync(password, salt, 64, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const N = Number(parts[1]), r = Number(parts[2]), p = Number(parts[3]);
  const salt = Buffer.from(parts[4]!, 'hex');
  const expected = Buffer.from(parts[5]!, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length, { N, r, p });
  return crypto.timingSafeEqual(actual, expected);
}

const sha256 = (v: string): string => crypto.createHash('sha256').update(v).digest('hex');

export function newToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: sha256(raw) };
}

export const hashKey = sha256;

const SESSION_DAYS = 30;

export interface SessionUser { customerId: number; email: string; sessionId: number }

export async function createCustomerSession(client: AnyClient, customerId: number, userAgent: string | null): Promise<string> {
  const t = newToken();
  const { rows } = await client.query(
    `INSERT INTO fresh.auth_sessions (customer_id, token_hash, user_agent, expires_at)
     VALUES ($1,$2,$3, now() + interval '${SESSION_DAYS} days') RETURNING id`,
    [customerId, t.hash, userAgent],
  );
  void rows;
  return t.raw;
}

export async function resolveSession(client: AnyClient, bearer: string | undefined): Promise<SessionUser | null> {
  if (!bearer) return null;
  const token = bearer.replace(/^Bearer\s+/i, '');
  const { rows } = await client.query(
    `SELECT s.id, s.customer_id, c.email FROM fresh.auth_sessions s
     JOIN fresh.customers c ON c.id = s.customer_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND c.status = 'ACTIVE'`,
    [sha256(token)],
  );
  if (!rows[0]) return null;
  return { customerId: Number(rows[0].customer_id), email: String(rows[0].email), sessionId: Number(rows[0].id) };
}

export async function revokeSession(client: AnyClient, sessionId: number): Promise<void> {
  await client.query(`UPDATE fresh.auth_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, [sessionId]);
}
