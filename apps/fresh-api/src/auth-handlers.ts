import { z } from 'zod';
import { pool, withTx, type AnyClient } from './db.js';
import { hashPassword, verifyPassword, createCustomerSession, resolveSession, revokeSession, type SessionUser } from './auth.js';
import { StateError } from './validation.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  first_name: z.string().max(80).optional(),
  last_name: z.string().max(80).optional(),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

function authError(message: string, status: number): Error {
  const e = new StateError(message);
  (e as Error & { status?: number }).status = status;
  return e;
}

export async function registerCustomer(body: unknown, userAgent: string | null) {
  const p = registerSchema.parse(body);
  return withTx(async (c: AnyClient) => {
    const dup = await c.query(`SELECT 1 FROM fresh.customers WHERE lower(email) = lower($1)`, [p.email]);
    if (dup.rowCount) throw authError('email already registered', 409);
    const { rows } = await c.query(
      `INSERT INTO fresh.customers (email, password_hash, first_name, last_name) VALUES ($1,$2,$3,$4) RETURNING id`,
      [p.email, hashPassword(p.password), p.first_name ?? null, p.last_name ?? null],
    );
    const customerId = Number(rows[0]!.id);
    const token = await createCustomerSession(c, customerId, userAgent);
    return { customer_id: customerId, email: p.email, token };
  });
}

export async function loginCustomer(body: unknown, userAgent: string | null) {
  const p = loginSchema.parse(body);
  const { rows } = await pool.query(
    `SELECT id, password_hash FROM fresh.customers WHERE lower(email) = lower($1) AND status = 'ACTIVE'`,
    [p.email],
  );
  if (!rows[0] || !verifyPassword(p.password, String(rows[0]!.password_hash))) {
    throw authError('invalid email or password', 401);
  }
  const customerId = Number(rows[0]!.id);
  const token = await withTx(async (c) => {
    await c.query(`UPDATE fresh.customers SET last_login_at = now() WHERE id = $1`, [customerId]);
    return createCustomerSession(c, customerId, userAgent);
  });
  return { customer_id: customerId, email: p.email, token };
}

export async function logoutCustomer(bearer: string | undefined) {
  const s = await resolveSession(pool, bearer);
  if (!s) throw authError('invalid or expired session', 401);
  await withTx(async (c) => revokeSession(c, s.sessionId));
  return { logged_out: true };
}

export function requireCustomer(bearer: string | undefined): Promise<SessionUser> {
  return resolveSession(pool, bearer).then((s) => {
    if (!s) throw authError('authentication required', 401);
    return s;
  });
}

export async function me(bearer: string | undefined) {
  const s = await requireCustomer(bearer);
  const { rows } = await pool.query(
    `SELECT id, email, first_name, last_name, email_verified_at, created_at FROM fresh.customers WHERE id = $1`,
    [s.customerId],
  );
  return { customer: rows[0] };
}
