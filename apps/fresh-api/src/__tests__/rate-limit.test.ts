import { describe, expect, it } from 'vitest';
import { checkRateLimit } from '../rate-limit.js';

describe('rate limiting', () => {
  it('allows auth attempts up to the window limit, then blocks', () => {
    const ip = `198.51.100.${Math.floor(Math.random() * 200)}`;
    for (let i = 0; i < 5; i += 1) {
      const r = checkRateLimit(ip, '/api/v1/auth/login', 'POST');
      expect(r.allowed).toBe(true);
      expect(r.scope).toBe('auth');
    }
    const blocked = checkRateLimit(ip, '/api/v1/auth/login', 'POST');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('leaves unrelated reads open', () => {
    const r = checkRateLimit('203.0.113.9', '/api/v1/catalogue/gemstones', 'GET');
    expect(r.allowed).toBe(true);
    expect(r.scope).toBe('open');
  });

  it('scopes counters per IP', () => {
    const a = checkRateLimit('192.0.2.10', '/api/v1/admin/login', 'POST');
    const b = checkRateLimit('192.0.2.11', '/api/v1/admin/login', 'POST');
    expect(a.allowed && b.allowed).toBe(true);
  });
});
