/**
 * F3-AUTH round 2 — vendor + admin authentication on fresh-api.
 *
 * Vendors: email + password login → session token (SHA-256 at rest).
 * Admins: email + password login → session token (SHA-256 at rest).
 * The API key remains for API-to-API calls; the dashboard uses sessions.
 *
 * Password hashing: scrypt (memory-hard) — same format as customers.
 * `scrypt$N$r$p$salt$hash`
 */
import crypto from 'node:crypto';
import type { AnyClient } from './db.js';
import { StateError } from './validation.js';

const sha256 = (v: string): string => crypto.createHash('sha256').update(v).digest('hex');

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
  const saltHex = parts[4]!;
  const hashHex = parts[5]!;
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  if (N < 2 || N > 1 << 20 || r < 1 || r > 32 || p < 1 || p > 16) return false;
  if (!/^[0-9a-f]+$/i.test(saltHex) || saltHex.length % 2 !== 0) return false;
  if (!/^[0-9a-f]+$/i.test(hashHex) || hashHex.length < 32 || hashHex.length % 2 !== 0) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  try {
    const actual = crypto.scryptSync(password, salt, expected.length, { N, r, p });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function newToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: sha256(raw) };
}

/* ------------------------------------------------------------------ vendor */

const VENDOR_SESSION_DAYS = 30;

export interface VendorSession { vendorId: number; vendorCode: string; sessionId: number }

export async function vendorLogin(client: AnyClient, email: string, password: string, _userAgent: string | null): Promise<{ token: string; vendor: { code: string; name: string } }> {
  const { rows } = await client.query(
    `SELECT v.id, v.code, v.name, v.status, vo.password_hash
     FROM fresh.vendors v
     JOIN fresh.vendor_onboarding vo ON vo.vendor_id = v.id
     WHERE lower(vo.email) = lower($1) AND v.status = 'ACTIVE' AND vo.status = 'APPROVED'`,
    [email],
  );
  if (!rows[0]) {
    const e = new StateError('invalid email or password');
    (e as Error & { status?: number }).status = 401;
    throw e;
  }
  if (!rows[0].password_hash) {
    const e = new StateError('password not set for this account — use the first-time setup link');
    (e as Error & { status?: number }).status = 409;
    throw e;
  }
  if (!verifyPassword(password, String(rows[0].password_hash))) {
    const e = new StateError('invalid email or password');
    (e as Error & { status?: number }).status = 401;
    throw e;
  }
  const vendorId = Number(rows[0].id);
  const t = await issueVendorSession(client, vendorId, _userAgent);
  return {
    token: t,
    vendor: { code: String(rows[0].code), name: String(rows[0].name) },
  };
}

async function issueVendorSession(client: AnyClient, vendorId: number, userAgent: string | null): Promise<string> {
  const t = newToken();
  await client.query(
    `INSERT INTO fresh.vendor_sessions (vendor_id, token_hash, user_agent, expires_at)
     VALUES ($1,$2,$3, now() + interval '${VENDOR_SESSION_DAYS} days')`,
    [vendorId, t.hash, userAgent],
  );
  await client.query(`UPDATE fresh.vendors SET last_login_at = now() WHERE id = $1`, [vendorId]);
  return t.raw;
}

export async function resolveVendorSession(client: AnyClient, bearer: string | undefined): Promise<VendorSession | null> {
  if (!bearer) return null;
  const token = bearer.replace(/^Bearer\s+/i, '');
  const { rows } = await client.query(
    `SELECT s.id, s.vendor_id, v.code FROM fresh.vendor_sessions s
     JOIN fresh.vendors v ON v.id = s.vendor_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND v.status = 'ACTIVE'`,
    [sha256(token)],
  );
  if (!rows[0]) return null;
  return { vendorId: Number(rows[0].vendor_id), vendorCode: String(rows[0].code), sessionId: Number(rows[0].id) };
}

export async function revokeVendorSession(client: AnyClient, sessionId: number): Promise<void> {
  await client.query(`UPDATE fresh.vendor_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, [sessionId]);
}

export async function setVendorPassword(client: AnyClient, vendorId: number, password: string): Promise<void> {
  await client.query(
    `UPDATE fresh.vendor_onboarding SET password_hash = $2, password_set_at = now() WHERE vendor_id = $1`,
    [vendorId, hashPassword(password)],
  );
}

/**
 * First-time password setup: the vendor proves possession of the one-time API
 * key issued at onboarding approval, then sets a password and receives a
 * session. No email link required, no plaintext secret stored.
 */
export async function setupVendorPassword(
  client: AnyClient,
  code: string,
  apiKey: string,
  password: string,
  userAgent: string | null,
): Promise<{ token: string; vendor: { code: string; name: string } }> {
  if (password.length < 8) {
    const e = new StateError('password must be at least 8 characters');
    (e as Error & { status?: number }).status = 422;
    throw e;
  }
  const { rows } = await client.query(
    `SELECT v.id, v.code, v.name FROM fresh.vendors v
     JOIN fresh.vendor_onboarding o ON o.vendor_id = v.id
     WHERE v.code = $1 AND v.status = 'ACTIVE' AND o.status = 'APPROVED' AND o.api_key_hash = $2`,
    [code.toUpperCase(), sha256(apiKey)],
  );
  if (!rows[0]) {
    const e = new StateError('invalid vendor code or API key');
    (e as Error & { status?: number }).status = 401;
    throw e;
  }
  const vendorId = Number(rows[0].id);
  await setVendorPassword(client, vendorId, password);
  const token = await issueVendorSession(client, vendorId, userAgent);
  return { token, vendor: { code: String(rows[0].code), name: String(rows[0].name) } };
}

/** Vendors can submit via session OR API key. */
export async function requireVendorAuth(
  client: AnyClient,
  bearer: string | undefined,
  vendorKey: string | undefined,
  vendorCode: string | undefined,
): Promise<VendorSession | null> {
  // 1) session token
  const session = await resolveVendorSession(client, bearer);
  if (session) {
    // verify the code matches (if provided)
    if (vendorCode && session.vendorCode !== vendorCode.toUpperCase()) {
      const e = new StateError('vendor code mismatch');
      (e as Error & { status?: number }).status = 403;
      throw e;
    }
    return session;
  }
  // 2) API key fallback
  if (vendorKey && vendorCode) {
    const { rows } = await client.query(
      `SELECT 1 FROM fresh.vendors v JOIN fresh.vendor_onboarding o ON o.vendor_id = v.id
       WHERE v.code = $1 AND v.status = 'ACTIVE' AND o.status = 'APPROVED' AND o.api_key_hash = $2`,
      [vendorCode.toUpperCase(), sha256(vendorKey)],
    );
    if (rows[0]) return null; // API key valid but no session — allowed for API-only calls
  }
  const e = new StateError('vendor authentication required');
  (e as Error & { status?: number }).status = 401;
  throw e;
}

/* ------------------------------------------------------------------- admin */

const ADMIN_SESSION_HOURS = 12;

export interface AdminSession { adminId: number; email: string; role: string; sessionId: number }

export async function adminLogin(client: AnyClient, email: string, password: string, _userAgent: string | null): Promise<{ token: string; admin: { email: string; role: string } }> {
  const { rows } = await client.query(
    `SELECT id, email, password_hash, role FROM fresh.admin_users
     WHERE lower(email) = lower($1) AND password_hash != 'PENDING_SETUP'`,
    [email],
  );
  if (!rows[0]) {
    const e = new StateError('invalid email or password');
    (e as Error & { status?: number }).status = 401;
    throw e;
  }
  if (!rows[0].password_hash) {
    const e = new StateError('password not set for this account — use the first-time setup link');
    (e as Error & { status?: number }).status = 409;
    throw e;
  }
  if (!verifyPassword(password, String(rows[0].password_hash))) {
    const e = new StateError('invalid email or password');
    (e as Error & { status?: number }).status = 401;
    throw e;
  }
  const adminId = Number(rows[0].id);
  const t = newToken();
  await client.query(
    `INSERT INTO fresh.admin_sessions (admin_id, token_hash, expires_at)
     VALUES ($1,$2, now() + interval '${ADMIN_SESSION_HOURS} hours')`,
    [adminId, t.hash],
  );
  await client.query(`UPDATE fresh.admin_users SET last_login_at = now() WHERE id = $1`, [adminId]);
  return { token: t.raw, admin: { email: String(rows[0].email), role: String(rows[0].role) } };
}

export async function resolveAdminSession(client: AnyClient, bearer: string | undefined): Promise<AdminSession | null> {
  if (!bearer) return null;
  const token = bearer.replace(/^Bearer\s+/i, '');
  const { rows } = await client.query(
    `SELECT s.id, s.admin_id, a.email, a.role FROM fresh.admin_sessions s
     JOIN fresh.admin_users a ON a.id = s.admin_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
    [sha256(token)],
  );
  if (!rows[0]) return null;
  return { adminId: Number(rows[0].admin_id), email: String(rows[0].email), role: String(rows[0].role), sessionId: Number(rows[0].id) };
}

export async function revokeAdminSession(client: AnyClient, sessionId: number): Promise<void> {
  await client.query(`UPDATE fresh.admin_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, [sessionId]);
}

/** Admin auth: accepts a session token OR the env fallback token (dev only). */
export async function requireAdminAuth(client: AnyClient, bearer: string | undefined, envToken: string): Promise<AdminSession | { envOnly: true }> {
  if (!bearer) {
    const e = new StateError('admin authentication required');
    (e as Error & { status?: number }).status = 401;
    throw e;
  }
  const token = bearer.replace(/^Bearer\s+/i, '');
  // env fallback (dev)
  if (token === envToken) return { envOnly: true };
  const session = await resolveAdminSession(client, bearer);
  if (!session) {
    const e = new StateError('invalid or expired admin session');
    (e as Error & { status?: number }).status = 401;
    throw e;
  }
  return session;
}
