/**
 * apps/web/src/proxy.ts
 *
 * F4 (ADR-035): legacy URL parity is DESCOPED (fresh SEO start, no
 * redirects). This middleware now does exactly two things:
 *
 * 1. Host security — in production the host must be on ALLOWED_HOSTS
 *    (fail-closed 403; M-15).
 * 2. Sister-house resolution — `sapphire.` / `ruby.` / `emerald.` hosts (or
 *    a legacy `/sapphire/...` prefix) stamp the storefront context so the
 *    shared catalogue renders under the sister brand.
 *
 * Every other request falls through to the app router, which owns routing
 * and 404s (the old redirect resolver and its unknown-path 404
 * short-circuit are retired with doc 34).
 */
import { NextResponse, type NextRequest } from 'next/server';

import { isDevSeamEnabled } from '@maihan/config';

const SISTERS = new Set(['sapphire', 'ruby', 'emerald']);

function withStorefront(request: NextRequest, house: string): Headers {
  const headers = new Headers(request.headers);
  headers.set('x-maihan-storefront', house);
  return headers;
}

function resolveHouseFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const lower = host.toLowerCase().split(':')[0] ?? '';
  for (const sister of SISTERS) {
    if (lower === `${sister}.maihangems.com` || lower.startsWith(`${sister}.`)) return sister;
  }
  return null;
}

function resolveHouse(_request: NextRequest, firstSegment: string): string {
  if (SISTERS.has(firstSegment)) return firstSegment;
  return 'maihangems';
}

function stampStorefront(res: NextResponse, house: string): NextResponse {
  res.headers.set('x-maihan-storefront', house);
  return res;
}

function hostAllowed(request: NextRequest): boolean {
  if (isDevSeamEnabled()) return true;
  const raw = process.env['ALLOWED_HOSTS'] ?? '';
  const allowed = raw.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (allowed.length === 0) return false;
  const host = (request.headers.get('x-forwarded-host')?.split(',')[0] ?? request.headers.get('host') ?? '').toLowerCase().split(':')[0] ?? '';
  return allowed.some((h) => (h.startsWith('.') ? host.endsWith(h) || host === h.slice(1) : host === h));
}

export function proxy(request: NextRequest): NextResponse {
  if (!hostAllowed(request)) {
    return new NextResponse('Forbidden host.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const { pathname } = request.nextUrl;
  const first = pathname.split('/').filter(Boolean)[0] ?? '';
  const fromHost = resolveHouseFromHost(
    request.headers.get('x-forwarded-host')?.split(',')[0] ?? request.headers.get('host'),
  );
  const house = fromHost ?? resolveHouse(request, first);

  if (SISTERS.has(first)) {
    const rest = pathname.slice(first.length + 1) || '/';
    if (rest === '/' || rest === '') {
      return stampStorefront(
        NextResponse.next({ request: { headers: withStorefront(request, first) } }),
        first,
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = rest;
    url.searchParams.set('__sf', first);
    return stampStorefront(
      NextResponse.rewrite(url, { request: { headers: withStorefront(request, first) } }),
      first,
    );
  }

  return stampStorefront(
    NextResponse.next({ request: { headers: withStorefront(request, house) } }),
    house,
  );
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|media/|api/).*)'],
};
