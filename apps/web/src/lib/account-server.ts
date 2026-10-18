/**
 * apps/web/src/lib/account-server.ts
 *
 * Server Component seam for the customer & vendor authentication and account
 * portals. Forwards the `maihan_session` cookie (and legacy `maihan_client_ref`
 * fallback) to the application API (`/api/v1/**`).
 */
import 'server-only';
import { cookies } from 'next/headers';
import type { AuthenticatedActor } from '@maihan/db';
import { apiFetch } from './api-origin.js';

export const CLIENT_REF_COOKIE = 'maihan_client_ref';
export const SESSION_COOKIE = 'maihan_session';

export async function getSessionCookie(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value?.trim() ?? '';
  return value.length > 0 ? value : null;
}

export async function getClientRef(): Promise<string | null> {
  const store = await cookies();
  const sessionVal = store.get(SESSION_COOKIE)?.value?.trim() ?? '';
  if (sessionVal.length > 0) return sessionVal;
  const value = store.get(CLIENT_REF_COOKIE)?.value?.trim() ?? '';
  return value.length > 0 ? value : null;
}

export interface AccountApiResult<T> {
  readonly ok: boolean;
  readonly status: number;
  readonly code: string | null;
  readonly message: string | null;
  readonly data: T | null;
}

export async function getAuthenticatedSessionActor(): Promise<AuthenticatedActor | null> {
  const sessionToken = await getSessionCookie();
  if (!sessionToken) return null;
  const headers = new Headers();
  headers.set('cookie', `${SESSION_COOKIE}=${encodeURIComponent(sessionToken)}`);
  headers.set('authorization', `Bearer ${sessionToken}`);
  try {
    const res = await apiFetch('/api/v1/auth/session', { headers });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: { actor?: AuthenticatedActor } };
    return body?.data?.actor ?? null;
  } catch {
    return null;
  }
}

export async function accountApi<T>(
  path: string,
  init: RequestInit = {},
  explicitRef?: string,
): Promise<AccountApiResult<T>> {
  const store = await cookies();
  const sessionToken = store.get(SESSION_COOKIE)?.value?.trim() ?? '';
  const clientRef = explicitRef?.trim() || (store.get(CLIENT_REF_COOKIE)?.value?.trim() ?? '');

  if (!sessionToken && !clientRef) {
    return { ok: false, status: 401, code: 'UNAUTHORIZED', message: null, data: null };
  }

  const headers = new Headers(init.headers);
  if (sessionToken) {
    headers.set('authorization', `Bearer ${sessionToken}`);
    headers.set('cookie', `${SESSION_COOKIE}=${encodeURIComponent(sessionToken)}`);
  }
  if (clientRef) {
    headers.set('x-customer-id', clientRef);
  }

  try {
    const response = await apiFetch(`/api/v1${path}`, { ...init, headers });
    const body = (await response.json().catch(() => null)) as
      | { data?: T; error?: { code?: string; message?: string } }
      | null;
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        code: body?.error?.code ?? null,
        message: body?.error?.message ?? null,
        data: null,
      };
    }
    return {
      ok: true,
      status: response.status,
      code: null,
      message: null,
      data: (body?.data ?? null) as T | null,
    };
  } catch {
    return {
      ok: false,
      status: 502,
      code: 'BAD_GATEWAY',
      message: 'The Maihan API is unreachable.',
      data: null,
    };
  }
}
