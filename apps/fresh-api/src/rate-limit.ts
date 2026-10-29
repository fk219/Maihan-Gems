/**
 * F4 — lightweight sliding-window rate limiter for fresh-api.
 *
 * Dev service (localhost bind) — a simple in-memory limiter is proportionate.
 * Production will swap to a shared store (the module seam is here).
 * Scopes: auth-sensitive routes get tighter windows; reads stay open.
 */

interface WindowState {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowState>();

const RULES: Array<{ pattern: RegExp; max: number; windowMs: number; scope: string }> = [
  // auth: brute-force protection (5 per minute per IP)
  { pattern: /^\/api\/v1\/auth\/(register|login)$/, max: 5, windowMs: 60_000, scope: 'auth' },
  { pattern: /^\/api\/v1\/admin\/login$/, max: 5, windowMs: 60_000, scope: 'admin_login' },
  // submissions: moderate (30 per hour per vendor)
  { pattern: /^\/api\/v1\/vendors\/[^/]+\/submissions$/, max: 30, windowMs: 3_600_000, scope: 'vendor_submit' },
  // write ops: 100 per minute per IP
  { pattern: /^\/api\/v1\/(carts|orders|configurations)/, max: 100, windowMs: 60_000, scope: 'commerce' },
];

export interface RateLimitResult {
  allowed: boolean;
  scope: string;
  remaining: number;
  retryAfterSec: number;
}

export function checkRateLimit(ip: string, path: string): RateLimitResult {
  for (const rule of RULES) {
    if (!rule.pattern.test(path)) continue;
    const key = `${rule.scope}:${ip}`;
    const now = Date.now();
    let state = windows.get(key);
    if (!state || state.resetAt <= now) {
      state = { count: 0, resetAt: now + rule.windowMs };
      windows.set(key, state);
    }
    state.count++;
    const remaining = Math.max(0, rule.max - state.count);
    if (state.count > rule.max) {
      return {
        allowed: false, scope: rule.scope, remaining: 0,
        retryAfterSec: Math.ceil((state.resetAt - now) / 1000),
      };
    }
    return { allowed: true, scope: rule.scope, remaining, retryAfterSec: 0 };
  }
  return { allowed: true, scope: 'open', remaining: Infinity, retryAfterSec: 0 };
}
