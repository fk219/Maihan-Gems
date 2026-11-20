/**
 * packages/domain/src/auth/password.spec.ts
 *
 * ADR-027 — the properties that make the credential store safe:
 *   - a correct password verifies and a wrong one does not;
 *   - the stored string never contains the password;
 *   - two hashes of the same password differ (salted);
 *   - a weakened parameter set is detected for rehash-on-login;
 *   - a malformed encoding is rejected rather than treated as "no password".
 */
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword, needsRehash } from './password.js';
import {
  generateSessionToken,
  hashSessionToken,
  sessionExpiry,
  SESSION_TTL_MS,
} from './session.js';

describe('password hashing', () => {
  it('verifies the correct password and rejects a wrong one', async () => {
    const encoded = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('correct horse battery staple', encoded)).resolves.toBe(true);
    await expect(verifyPassword('correct horse battery stapl', encoded)).resolves.toBe(false);
  });

  it('never embeds the plaintext and salts every hash', async () => {
    const first = await hashPassword('same-password-value');
    const second = await hashPassword('same-password-value');
    expect(first).not.toContain('same-password-value');
    expect(first).not.toBe(second);
    await expect(verifyPassword('same-password-value', first)).resolves.toBe(true);
    await expect(verifyPassword('same-password-value', second)).resolves.toBe(true);
  });

  it('flags a weaker cost factor for rehash-on-login', async () => {
    const weak = await hashPassword('a-password', { N: 4096, r: 8, p: 1, keylen: 64 });
    expect(needsRehash(weak)).toBe(true);
    const current = await hashPassword('a-password');
    expect(needsRehash(current)).toBe(false);
  });

  it('rejects a malformed encoding instead of failing open', async () => {
    await expect(verifyPassword('x', 'not-a-hash')).rejects.toThrow();
    await expect(verifyPassword('x', 'scrypt$1$2$3')).rejects.toThrow();
  });

  it('rejects an empty password', async () => {
    await expect(hashPassword('')).rejects.toThrow();
  });
});

describe('session tokens', () => {
  it('are unique, long and URL-safe', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43); // 32 bytes base64url
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('are stored only as a deterministic digest', () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
    expect(hash).not.toContain(token);
    expect(hashSessionToken(token)).toBe(hash);
  });

  it('expiry is offset by the documented TTL', () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    expect(sessionExpiry(now)).toBe(new Date(now + SESSION_TTL_MS).toISOString());
  });
});
