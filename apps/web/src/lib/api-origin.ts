/**
 * apps/web/src/lib/api-origin.ts
 *
 * Server-side origin of the Maihan API plane.
 *
 * The storefront (Next) and the application API (`node dist/api/server.js`)
 * are separate processes; every server-side integration (account, checkout,
 * admin) calls the API over this origin instead of opening a second database
 * pool, so the API process remains the single owner of the locked-schema
 * tables and of cache/rate-limit/correlation policy.
 *
 *   - MAIHAN_API_URL wins when the deployment provides it (internal service
 *     URL in production).
 *   - In local single-machine development the API runs on API_PORT (default
 *     3001 per AGENTS.md), so the default origin is 127.0.0.1:3001.
 */
import 'server-only';

export function apiOrigin(): string {
  const explicit = process.env['MAIHAN_API_URL']?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const port = process.env['API_PORT']?.trim() || '3001';
  return `http://127.0.0.1:${port}`;
}

export async function apiFetch(
  path: string,
  init: RequestInit & { headers?: Headers } = {},
): Promise<Response> {
  const headers = new Headers(init.headers ?? new Headers());
  if (!headers.has('content-type') && init.body) {
    headers.set('content-type', 'application/json');
  }
  return fetch(`${apiOrigin()}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
}

/**
 * Admin-plane fetch: forwards the incoming request's server-trusted admin
 * identity headers to the API process. The console pages never render
 * operational data without the gate passing, and mutations ride the same
 * headers the API's capability gate expects.
 */
export async function adminOriginFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const [{ headers: nextHeaders }, { cookies: nextCookies }] = await Promise.all([
    import('next/headers'),
    import('next/headers'),
  ]);
  const [incoming, cookieStore] = await Promise.all([nextHeaders(), nextCookies()]);
  const headers = new Headers(init.headers);
  for (const name of ['x-admin-sub', 'x-admin-role', 'x-admin-session']) {
    const value = incoming.get(name);
    if (value !== null) headers.set(name, value);
  }
  const sessionToken = cookieStore.get('maihan_session')?.value?.trim();
  if (sessionToken) {
    headers.set('authorization', `Bearer ${sessionToken}`);
    headers.set('cookie', `maihan_session=${encodeURIComponent(sessionToken)}`);
  }
  if (!headers.has('content-type') && init.body) {
    headers.set('content-type', 'application/json');
  }
  return fetch(`${apiOrigin()}${path}`, { ...init, headers, cache: 'no-store' });
}
