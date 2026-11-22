import { describe, expect, it } from 'vitest';

import {
  COMMON_PASSWORDS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  commonPasswordKeys,
  isCommonPassword,
  validatePasswordPolicy,
} from './password-policy.js';

/**
 * Registration password policy — the only place a password is chosen.
 *
 * Two properties are load-bearing:
 *   1. the rule is exactly length >= 12 plus "not a top-100 password";
 *   2. no failure message ever contains the password.
 */
describe('password policy — length', () => {
  it('is exactly 12 characters and 200 characters', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
    expect(PASSWORD_MAX_LENGTH).toBe(200);
  });

  it('rejects 11 characters and accepts 12', () => {
    const eleven = validatePasswordPolicy('a'.repeat(11));
    expect(eleven?.code).toBe('TOO_SHORT');
    expect(eleven?.message).toContain('12');

    expect(validatePasswordPolicy('7Kq!mR2#vT9x')).toBeNull();
  });

  it('rejects a password past the upper bound instead of silently truncating', () => {
    expect(validatePasswordPolicy('a'.repeat(PASSWORD_MAX_LENGTH + 1))?.code).toBe('TOO_LONG');
  });
});

describe('password policy — the top-100 blocklist', () => {
  it('holds exactly 100 entries, all lowercase and unique', () => {
    expect(COMMON_PASSWORDS).toHaveLength(100);
    expect(new Set(COMMON_PASSWORDS).size).toBe(100);
    for (const entry of COMMON_PASSWORDS) expect(entry).toBe(entry.toLowerCase());
  });

  it('rejects a listed password in any case', () => {
    // `password` is 8 characters, so the length rule fires first; case
    // insensitivity is a property of the normaliser, asserted directly.
    expect(isCommonPassword('password')).toBe(true);
    expect(isCommonPassword('PASSWORD')).toBe(true);
    expect(isCommonPassword('Password')).toBe(true);

    // A listed password padded past the length floor is rejected as common,
    // not as short.
    for (const password of ['Password1234', 'PASSWORD1234']) {
      expect(validatePasswordPolicy(password)?.code).toBe('COMMON_PASSWORD');
    }
  });

  it('rejects a listed password with punctuation and trailing digits attached', () => {
    // The variants a person reaches for when a form demands "a symbol".
    expect(validatePasswordPolicy('P@ssw0rd1234')).not.toBeNull();
    expect(validatePasswordPolicy('password!!')).not.toBeNull();
    expect(validatePasswordPolicy('Iloveyou2026')).not.toBeNull();
  });

  it('rejects a listed password behind leet substitutions', () => {
    expect(isCommonPassword('l3tm31n')).toBe(true); // letmein
    expect(isCommonPassword('st@rw@rs')).toBe(true); // starwars
    expect(isCommonPassword('p@ssw0rd')).toBe(true); // password
  });

  it('accepts a long, non-listed passphrase', () => {
    expect(validatePasswordPolicy('emerald-vein-through-quartz')).toBeNull();
    expect(validatePasswordPolicy('TsavoriteGarnet#41')).toBeNull();
  });

  it('normalises to the same keys for cosmetic variants', () => {
    const keys = commonPasswordKeys('Pass-Word!');
    expect(keys).toContain('pass-word!');
    expect(keys).toContain('password');
  });
});

describe('password policy — no secret escapes', () => {
  it('never includes the password in a failure message', () => {
    const candidates = ['short', 'password', 'P@ssw0rd1234', 'x'.repeat(201)];
    for (const password of candidates) {
      const violation = validatePasswordPolicy(password);
      expect(violation).not.toBeNull();
      expect(violation?.message).not.toContain(password);
    }
  });

  it('returns only the first violation, never a rules checklist', () => {
    // Too short AND common: the length message wins, and the result is one
    // object rather than an array an attacker could enumerate.
    const violation = validatePasswordPolicy('password');
    expect(violation?.code).toBe('TOO_SHORT');
    expect(Array.isArray(violation)).toBe(false);
  });
});
