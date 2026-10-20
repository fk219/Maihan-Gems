'use server';

/**
 * apps/web/src/app/(storefront)/account/actions.ts
 *
 * Server actions for the account portal identity seam.
 *
 * `openPortfolio` verifies the client reference against the REAL profile
 * endpoint before any cookie is written; `closePortfolio` clears it. The
 * actions return plain outcomes — the client renders the message, the API
 * remains the only authority on whether a portfolio exists.
 */
import { cookies } from 'next/headers';

import { CLIENT_REF_COOKIE, accountApi } from '../../../lib/account-server.js';
import type { CustomerProfileDto } from '@maihan/contracts';
import { isDevSeamEnabled } from '@maihan/config';

export type OpenPortfolioOutcome = 'ok' | 'rejected' | 'unreachable';

export async function openPortfolio(reference: string): Promise<OpenPortfolioOutcome> {
  const value = reference.trim();
  if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)) {
    return 'rejected';
  }
  const result = await accountApi<CustomerProfileDto>('/account/profile', {}, value);
  if (result.ok && result.data !== null) {
    const store = await cookies();
    store.set(CLIENT_REF_COOKIE, value, {
      httpOnly: true,
      sameSite: 'lax',
      secure: !isDevSeamEnabled(), // R1-1 fail-closed: Secure by default
      path: '/',
      maxAge: 60 * 60 * 12,
    });
    return 'ok';
  }
  return result.status === 502 ? 'unreachable' : 'rejected';
}

export async function closePortfolio(): Promise<void> {
  const store = await cookies();
  store.delete(CLIENT_REF_COOKIE);
}
