import { describe, expect, it } from 'vitest';
import { hashKey, hashPassword, newToken, verifyPassword } from '../auth.js';

describe('password hashing', () => {
  it('verifies the right password and rejects the wrong one', () => {
    const stored = hashPassword('CorrectHorse2026!');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('CorrectHorse2026!', stored)).toBe(true);
    expect(verifyPassword('correcthorse2026!', stored)).toBe(false);
  });

  it('salts every hash (same password, different digest)', () => {
    expect(hashPassword('same-password')).not.toBe(hashPassword('same-password'));
  });

  it('rejects malformed stored hashes without throwing', () => {
    expect(verifyPassword('x', 'not-a-hash')).toBe(false);
    expect(verifyPassword('x', 'scrypt$1$2$3$zz$zz')).toBe(false);
  });

  it('issues 32-byte tokens whose stored hash matches hashKey', () => {
    const t = newToken();
    expect(t.raw).toHaveLength(64);
    expect(t.hash).toBe(hashKey(t.raw));
    expect(t.hash).not.toBe(t.raw);
  });
});
