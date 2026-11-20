/**
 * packages/domain/src/auth/password.ts
 *
 * ADR-027 — password hashing without a new dependency.
 *
 * scrypt is memory-hard and ships with Node (`node:crypto`), so it satisfies
 * the "no silent technology additions" rule without an ADR for argon2/bcrypt
 * bindings. The encoded string carries every parameter it needs, so a future
 * cost increase is a rehash-on-login, not a migration.
 *
 * Format: scrypt$<N>$<r>$<p>$<salt-b64>$<hash-b64>
 *
 * Verification is constant-time over the derived key. Neither function logs,
 * throws with the secret, or returns the secret.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

export interface ScryptParams {
  readonly N: number;
  readonly r: number;
  readonly p: number;
  readonly keylen: number;
}

/** OWASP-recommended baseline for interactive logins. */
export const DEFAULT_SCRYPT: ScryptParams = Object.freeze({
  N: 16384,
  r: 8,
  p: 1,
  keylen: 64,
});

const MAXMEM = 64 * 1024 * 1024;

export class PasswordFormatError extends Error {
  constructor() {
    super('PASSWORD_HASH: unrecognised encoding');
    this.name = 'PasswordFormatError';
  }
}

export async function hashPassword(
  password: string,
  params: ScryptParams = DEFAULT_SCRYPT,
): Promise<string> {
  if (password.length === 0) throw new Error('PASSWORD: empty password rejected');
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, params.keylen, {
    N: params.N,
    r: params.r,
    p: params.p,
    maxmem: MAXMEM,
  });
  return [
    'scrypt',
    params.N,
    params.r,
    params.p,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$');
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') throw new PasswordFormatError();
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    throw new PasswordFormatError();
  }
  const salt = Buffer.from(parts[4] as string, 'base64');
  const expected = Buffer.from(parts[5] as string, 'base64');
  if (salt.length === 0 || expected.length === 0) throw new PasswordFormatError();

  const actual = await scrypt(password, salt, expected.length, { N, r, p, maxmem: MAXMEM });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** True when the stored hash uses weaker parameters than the current default. */
export function needsRehash(encoded: string, params: ScryptParams = DEFAULT_SCRYPT): boolean {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return true;
  return Number(parts[1]) < params.N || Number(parts[2]) < params.r || Number(parts[3]) < params.p;
}
