import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, generateTotpSecret, totpAt, verifyTotpAt } from '../totp.js';

// RFC 6238 SHA-1 vectors (secret ASCII "12345678901234567890").
const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('TOTP (RFC 6238)', () => {
  it('matches the published SHA-1 vectors (6 digits)', () => {
    const vectors: Array<[number, string]> = [
      [1, '287082'],
      [37037036, '081804'],
      [37037037, '050471'],
      [41152263, '005924'],
      [66666666, '279037'],
      [666666666, '353130'],
    ];
    for (const [counter, code] of vectors) expect(totpAt(SECRET, counter)).toBe(code);
  });

  it('accepts the current window and rejects wrong codes', () => {
    const code = totpAt(SECRET, 100);
    expect(verifyTotpAt(SECRET, code, 100)).toBe(true);
    expect(verifyTotpAt(SECRET, code, 99)).toBe(true);  // ±1 step
    expect(verifyTotpAt(SECRET, code, 101)).toBe(true);
    expect(verifyTotpAt(SECRET, code, 102)).toBe(false);
    expect(verifyTotpAt(SECRET, '000000', 100, 0)).toBe(false);
    expect(verifyTotpAt(SECRET, 'abcdef', 100)).toBe(false);
  });

  it('round-trips base32 and generates 32-char secrets', () => {
    const bytes = Buffer.from('maihan-gems-totp');
    expect(base32Decode(base32Encode(bytes)).equals(bytes)).toBe(true);
    expect(generateTotpSecret()).toMatch(/^[A-Z2-7]{32}$/);
  });
});
