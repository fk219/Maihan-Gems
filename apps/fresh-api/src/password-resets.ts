/**
 * Password reset + change for every actor kind.
 *
 * Reset: an emailed single-use token (SHA-256 at rest, 60 minutes). The raw
 * token is returned ONLY outside production so local dev without a mail
 * provider can complete the flow; in production the outbox carries it.
 */
import type { AnyClient } from './db.js';
import { hashPassword, verifyPassword, newToken, hashKey } from './auth.js';
import { queueEmail, resetEmail } from './mail.js';
import { log } from './logging.js';
import { StateError } from './validation.js';

export type ActorKind = 'CUSTOMER' | 'VENDOR' | 'ADMIN';

function fail(message: string, status: number): Error {
  const e = new StateError(message);
  (e as Error & { status?: number }).status = status;
  return e;
}

const RESET_MINUTES = 60;

async function findActor(client: AnyClient, kind: ActorKind, email: string): Promise<{ id: number; email: string } | null> {
  if (kind === 'CUSTOMER') {
    const { rows } = await client.query(
      `SELECT id, email FROM fresh.customers WHERE lower(email) = lower($1) AND status = 'ACTIVE'`,
      [email],
    );
    return rows[0] ? { id: Number(rows[0].id), email: String(rows[0].email) } : null;
  }
  if (kind === 'VENDOR') {
    const { rows } = await client.query(
      `SELECT v.id, o.email FROM fresh.vendors v JOIN fresh.vendor_onboarding o ON o.vendor_id = v.id
       WHERE lower(o.email) = lower($1) AND v.status = 'ACTIVE' AND o.status = 'APPROVED'`,
      [email],
    );
    return rows[0] ? { id: Number(rows[0].id), email: String(rows[0].email) } : null;
  }
  const { rows } = await client.query(
    `SELECT id, email FROM fresh.admin_users WHERE lower(email) = lower($1)`,
    [email],
  );
  return rows[0] ? { id: Number(rows[0].id), email: String(rows[0].email) } : null;
}

async function actorByToken(client: AnyClient, kind: ActorKind, token: string): Promise<{ actorId: number; resetId: number } | null> {
  const { rows } = await client.query(
    `SELECT id, actor_id FROM fresh.password_resets
     WHERE actor_kind = $1 AND token_hash = $2 AND used_at IS NULL AND expires_at > now()`,
    [kind, hashKey(token)],
  );
  return rows[0] ? { actorId: Number(rows[0].actor_id), resetId: Number(rows[0].id) } : null;
}

export interface ResetRequestResult {
  ok: true;
  /** Present only outside production (dev mail transport). */
  token?: string;
}

export async function requestPasswordReset(
  client: AnyClient,
  kind: ActorKind,
  email: string,
): Promise<ResetRequestResult> {
  const actor = await findActor(client, kind, email.trim());
  // Always answer ok: never disclose whether an address is registered.
  if (!actor) return { ok: true };
  const t = newToken();
  await client.query(
    `INSERT INTO fresh.password_resets (actor_kind, actor_id, token_hash, expires_at)
     VALUES ($1,$2,$3, now() + interval '${RESET_MINUTES} minutes')`,
    [kind, actor.id, t.hash],
  );
  const mail = resetEmail(kind, t.raw);
  await queueEmail(client, { to: actor.email, subject: mail.subject, body: mail.body });
  log('info', 'password reset requested', { actor_kind: kind, actor_id: actor.id });
  return process.env.MAIHAN_ENV !== 'production' ? { ok: true, token: t.raw } : { ok: true };
}

async function revokeActorSessions(client: AnyClient, kind: ActorKind, actorId: number): Promise<void> {
  if (kind === 'CUSTOMER') {
    await client.query(`UPDATE fresh.auth_sessions SET revoked_at = now() WHERE customer_id = $1 AND revoked_at IS NULL`, [actorId]);
  } else if (kind === 'VENDOR') {
    await client.query(`UPDATE fresh.vendor_sessions SET revoked_at = now() WHERE vendor_id = $1 AND revoked_at IS NULL`, [actorId]);
  } else {
    await client.query(`UPDATE fresh.admin_sessions SET revoked_at = now() WHERE admin_id = $1 AND revoked_at IS NULL`, [actorId]);
  }
}

async function setActorPassword(client: AnyClient, kind: ActorKind, actorId: number, password: string): Promise<void> {
  const hash = hashPassword(password);
  if (kind === 'CUSTOMER') {
    await client.query(`UPDATE fresh.customers SET password_hash = $2, updated_at = now() WHERE id = $1`, [actorId, hash]);
  } else if (kind === 'VENDOR') {
    await client.query(`UPDATE fresh.vendor_onboarding SET password_hash = $2, password_set_at = now() WHERE vendor_id = $1`, [actorId, hash]);
  } else {
    await client.query(`UPDATE fresh.admin_users SET password_hash = $2 WHERE id = $1`, [actorId, hash]);
  }
}

export async function resetPassword(
  client: AnyClient,
  kind: ActorKind,
  token: string,
  password: string,
): Promise<{ ok: true }> {
  if (password.length < 8) throw fail('password must be at least 8 characters', 422);
  const found = await actorByToken(client, kind, token.trim());
  if (!found) throw fail('invalid or expired reset token', 401);
  await client.query(`UPDATE fresh.password_resets SET used_at = now() WHERE id = $1`, [found.resetId]);
  await setActorPassword(client, kind, found.actorId, password);
  await revokeActorSessions(client, kind, found.actorId);
  log('info', 'password reset completed', { actor_kind: kind, actor_id: found.actorId });
  return { ok: true };
}

export async function changePassword(
  client: AnyClient,
  kind: ActorKind,
  actorId: number,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true }> {
  if (newPassword.length < 8) throw fail('new password must be at least 8 characters', 422);
  let stored: string | null = null;
  if (kind === 'CUSTOMER') {
    const { rows } = await client.query(`SELECT password_hash FROM fresh.customers WHERE id = $1`, [actorId]);
    stored = rows[0]?.password_hash ?? null;
  } else if (kind === 'VENDOR') {
    const { rows } = await client.query(`SELECT password_hash FROM fresh.vendor_onboarding WHERE vendor_id = $1`, [actorId]);
    stored = rows[0]?.password_hash ?? null;
  } else {
    const { rows } = await client.query(`SELECT password_hash FROM fresh.admin_users WHERE id = $1`, [actorId]);
    stored = rows[0]?.password_hash ?? null;
  }
  if (!stored || !verifyPassword(currentPassword, stored)) throw fail('current password is incorrect', 401);
  await setActorPassword(client, kind, actorId, newPassword);
  log('info', 'password changed', { actor_kind: kind, actor_id: actorId });
  return { ok: true };
}
