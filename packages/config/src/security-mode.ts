/**
 * packages/config/src/security-mode.ts
 *
 * R1-1 (fail-closed security mode) — single authority for the
 * production/dev-seam decision, shared by `apps/web` and `packages/db`.
 *
 * Audit finding: identity-header trust, header stripping, cookie flags and
 * auth requirements were each independently keyed on
 * `process.env['MAIHAN_ENV'] === 'production'`. A deployment that forgets to
 * set MAIHAN_ENV silently lands in "dev" behaviour: spoofable
 * `x-customer-id`/`x-admin-*` headers are honoured, reset tokens leak into
 * API responses, secure cookie flags are dropped and the edge host
 * allow-list is disabled. That is fail-OPEN on a missing variable.
 *
 * Rule (AGENTS.md §10, "Fail closed"): security-sensitive behaviour must be
 * the DEFAULT. The non-production developer seam is opt-IN only via an
 * explicit, unambiguous signal:
 *
 *   - MAIHAN_DEV_SEAM='1'            => seam enabled (local development)
 *   - NODE_ENV='test'|'development'  => seam enabled (vitest / next dev)
 *   - anything else                  => FAIL CLOSED (treat as production)
 *
 * MAIHAN_ENV remains a deployment *record* (startup guard, .env.example) and
 * still forces fail-closed when it says 'production'; it can no longer force
 * fail-open anywhere, because absence of the variable now means secure.
 */

export const SPOOFABLE_IDENTITY_HEADERS: ReadonlySet<string> = new Set([
  'x-admin-sub',
  'x-admin-role',
  'x-admin-session',
  'x-customer-id',
]);

/** True only when an explicit developer seam has been opted into. */
export function isDevSeamEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env['MAIHAN_ENV'] === 'production') return false;
  if (env['MAIHAN_DEV_SEAM'] === '1') return true;
  return env['NODE_ENV'] === 'test' || env['NODE_ENV'] === 'development';
}

/** Convenience inverse used at security gates: default-deny. */
export function isFailClosedMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return !isDevSeamEnabled(env);
}
