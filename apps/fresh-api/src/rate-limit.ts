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

interface Rule {
  pattern: RegExp;
  methods?: string[];
  max: number;
  windowMs: number;
  scope: string;
}

const RULES: Rule[] = [
  // auth: brute-force protection (5 per minute per IP)
  { pattern: /^\/api\/v1\/auth\/(register|login)$/, methods: ['POST'], max: 5, windowMs: 60_000, scope: 'auth' },
  { pattern: /^\/api\/v1\/admin\/login$/, methods: ['POST'], max: 5, windowMs: 60_000, scope: 'admin_login' },
  { pattern: /^\/api\/v1\/admin\/auth\/login$/, methods: ['POST'], max: 5, windowMs: 60_000, scope: 'admin_login' },
  { pattern: /^\/api\/v1\/vendor\/auth\/login$/, methods: ['POST'], max: 10, windowMs: 60_000, scope: 'vendor_login' },
  { pattern: /^\/api\/v1\/vendor\/auth\/setup$/, methods: ['POST'], max: 5, windowMs: 60_000, scope: 'vendor_setup' },
  // password reset + change: tight, both request and consume
  { pattern: /^\/api\/v1\/(auth|vendor\/auth|admin\/auth)\/(request-reset|reset)$/, methods: ['POST'], max: 5, windowMs: 900_000, scope: 'password_reset' },
  { pattern: /^\/api\/v1\/(auth|vendor\/auth|admin\/auth)\/change-password$/, methods: ['POST'], max: 10, windowMs: 60_000, scope: 'password_change' },
  { pattern: /^\/api\/v1\/auth\/(verify-email|resend-verification)$/, methods: ['POST'], max: 10, windowMs: 900_000, scope: 'email_verify' },
  { pattern: /^\/api\/v1\/vendors\/[^/]+\/api-key$/, methods: ['POST'], max: 5, windowMs: 900_000, scope: 'api_key_rotate' },
  // public lead capture: spam protection
  { pattern: /^\/api\/v1\/leads$/, methods: ['POST'], max: 10, windowMs: 3_600_000, scope: 'leads' },
  { pattern: /^\/api\/v1\/leads\/unsubscribe$/, methods: ['POST'], max: 10, windowMs: 3_600_000, scope: 'leads_unsubscribe' },
  { pattern: /^\/api\/v1\/concierge$/, methods: ['POST'], max: 30, windowMs: 60_000, scope: 'concierge' },
  // submissions: moderate (30 per hour per vendor) — writes only
  { pattern: /^\/api\/v1\/vendors\/[^/]+\/submissions$/, methods: ['POST'], max: 30, windowMs: 3_600_000, scope: 'vendor_submit' },
  // vendor media/certificates writes
  { pattern: /^\/api\/v1\/vendors\/[^/]+\/inventory\//, methods: ['POST', 'DELETE'], max: 60, windowMs: 60_000, scope: 'vendor_media' },
  // write ops: 100 per minute per IP
  { pattern: /^\/api\/v1\/(carts|orders|configurations)/, max: 100, windowMs: 60_000, scope: 'commerce' },
];

function matchRule(path: string, method: string): Rule | null {
  for (const rule of RULES) {
    if (!rule.pattern.test(path)) continue;
    if (rule.methods && !rule.methods.includes(method.toUpperCase())) continue;
    return rule;
  }
  return null;
}

export interface RateLimitResult {
  allowed: boolean;
  scope: string;
  remaining: number;
  retryAfterSec: number;
}

export function checkRateLimit(ip: string, path: string, method = 'GET'): RateLimitResult {
  const rule = matchRule(path, method);
  if (!rule) return { allowed: true, scope: 'open', remaining: Infinity, retryAfterSec: 0 };
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

interface SharedClient {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
}

/**
 * Multi-instance limiter: atomic Postgres upsert per (scope, IP). Falls back
 * to the in-memory window if the database is unavailable (fail open — a
 * database outage must not take the API down for legitimate traffic).
 */
export async function checkRateLimitShared(
  client: SharedClient,
  ip: string,
  path: string,
  method = 'GET',
): Promise<RateLimitResult> {
  const rule = matchRule(path, method);
  if (!rule) return { allowed: true, scope: 'open', remaining: Infinity, retryAfterSec: 0 };
  const key = `${rule.scope}:${ip}`;
  try {
    const { rows } = await client.query(
      `INSERT INTO fresh.rate_limits (key, count, reset_at)
       VALUES ($1, 1, now() + ($2::text || ' milliseconds')::interval)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN fresh.rate_limits.reset_at <= now() THEN 1 ELSE fresh.rate_limits.count + 1 END,
         reset_at = CASE WHEN fresh.rate_limits.reset_at <= now()
                         THEN now() + ($2::text || ' milliseconds')::interval
                         ELSE fresh.rate_limits.reset_at END
       RETURNING count, reset_at`,
      [key, rule.windowMs],
    );
    const count = Number(rows[0]?.count ?? 1);
    const resetAt = new Date(String(rows[0]?.reset_at ?? new Date(Date.now() + rule.windowMs)));
    if (Math.random() < 0.01) {
      await client.query(`DELETE FROM fresh.rate_limits WHERE reset_at < now() - interval '1 day'`);
    }
    return count > rule.max
      ? { allowed: false, scope: rule.scope, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000)) }
      : { allowed: true, scope: rule.scope, remaining: Math.max(0, rule.max - count), retryAfterSec: 0 };
  } catch {
    return checkRateLimit(ip, path, method);
  }
}
