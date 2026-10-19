/**
 * apps/web/src/proxy.ts
 *
 * Legacy URL parity at the edge (Phase 4 Task 6).
 *
 * Authority: technical_design/34 section 7 ("incoming request -> normalise
 * path -> direct route match? serve -> else redirect lookup"), SoT 13.1.
 *
 * Runs BEFORE routing, so every one of the 44,218 observed source URLs either
 * resolves directly (the proxy returns `next()`) or 301/302s to a target
 * that resolves — or returns an honest 410. An unknown path is never redirected
 * to `/` or to an unrelated page: it falls through to the framework's 404 with
 * its search/category suggestions (doc 34 section 11).
 *
 * The resolver (and therefore this proxy) is Edge-safe: `redirects.ts` is
 * a pure module with no Node dependency and no database access. The mapping is
 * held in memory as the section 3 family rules plus the generated rows.
 */
import { NextResponse, type NextRequest } from 'next/server';

import { createRedirectResolver } from './lib/redirects.js';
import { GENERATED_REDIRECT_ROWS } from './lib/redirects-rows.generated';

const resolver = createRedirectResolver(GENERATED_REDIRECT_ROWS);
const SISTERS = new Set(['sapphire', 'ruby', 'emerald']);
const NGC_LISTINGS = new Set([
  'natural-gemstones',
  'all-natural-gemstones',
  'natural-gemstone-pairs',
  'gemstone-rings',
  'all-gemstone-rings',
  'gemstone-earrings',
  'gemstone-necklaces-pendants',
  'gemstone-bracelets-bangles',
  'mens-gemstone-rings',
  'gemstone-ring-settings',
  'mens-gemstone-ring-settings',
  'gemstone-earring-settings',
  'gemstone-necklace-pendant-settings',
  'gemstone-bracelet-settings',
]);

function withStorefront(request: NextRequest, slug: string): Headers {
  const headers = new Headers(request.headers);
  headers.set('x-maihan-storefront', slug);
  return headers;
}

function stampStorefront(response: NextResponse, slug: string): NextResponse {
  response.cookies.set('maihan_storefront', slug, { path: '/', sameSite: 'lax' });
  return response;
}

function resolveHouse(request: NextRequest, first: string): string {
  if (SISTERS.has(first)) return first;
  const fromQuery = request.nextUrl.searchParams.get('__sf');
  if (fromQuery && SISTERS.has(fromQuery)) return fromQuery;
  const hinted = request.headers.get('x-maihan-storefront');
  if (hinted && SISTERS.has(hinted)) return hinted;
  return 'maihan';
}

function isNgcCanonicalProductPath(pathname: string): boolean {
  const last = pathname.split('/').filter(Boolean).pop() ?? '';
  return /(?:-k\d+|-pr\d+|-j\d+|js\d+[a-z0-9]*-k\d+)$/i.test(last);
}

function resolveHouseFromHost(host: string | null): string | null {
  if (!host) return null;
  const lower = host.toLowerCase().split(':')[0] ?? '';
  if (lower.startsWith('sapphire.')) return 'sapphire';
  if (lower.startsWith('ruby.')) return 'ruby';
  if (lower.startsWith('emerald.')) return 'emerald';
  return null;
}

/**
 * Production host allow-list (M-15). When MAIHAN_ENV=production and
 * ALLOWED_HOSTS is configured, any request whose Host is not on the list
 * (comma-separated, entries may be exact or a leading-dot suffix such as
 * `.maihangems.com`) fails closed with 403 — no host-header-driven cache or
 * SEO poisoning. Unset/empty list or non-production: every host passes.
 */
function hostAllowed(request: NextRequest): boolean {
  if (process.env['MAIHAN_ENV'] !== 'production') return true;
  const allowList = (process.env['ALLOWED_HOSTS'] ?? '').trim();
  if (!allowList) return true;
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host') || '';
  const lowerHost = host.toLowerCase().split(':')[0] ?? '';
  if (!lowerHost) return false;
  return allowList
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .some((allowed) =>
      allowed.startsWith('.') ? lowerHost.endsWith(allowed) || lowerHost === allowed.slice(1) : lowerHost === allowed,
    );
}

export function proxy(request: NextRequest): NextResponse {
  if (!hostAllowed(request)) {
    return new NextResponse('Forbidden host.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const { pathname, search } = request.nextUrl;
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

  // NGC research storefront serves source-shaped product URLs on
  // /[variety]/[slug]; do not 301 those away to /products/{stripped-slug}.
  if (isNgcCanonicalProductPath(pathname)) {
    return stampStorefront(
      NextResponse.next({ request: { headers: withStorefront(request, house) } }),
      house,
    );
  }

  const segments = pathname.split('/').filter(Boolean);
  const listing = segments[0] ?? '';
  if (
    segments.length === 1 &&
    (NGC_LISTINGS.has(listing) || /-(?:gemstones|gemstone-pairs|gemstone-rings)$/.test(listing))
  ) {
    return stampStorefront(
      NextResponse.next({ request: { headers: withStorefront(request, house) } }),
      house,
    );
  }

  const decision = resolver.resolve(pathname, search);
  if (decision === null) {
    return stampStorefront(
      NextResponse.next({ request: { headers: withStorefront(request, house) } }),
      house,
    );
  }

  if (decision.status === 410) {
    // A URL with no equivalent and no useful replacement: honest removal,
    // never a redirect to an unrelated page (doc 34 section 2).
    return new NextResponse('This page has been removed.', {
      status: 410,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const url = request.nextUrl.clone();
  const [targetPath = '/', targetQuery] = decision.target.split('?');
  url.pathname = targetPath;
  url.search = targetQuery === undefined ? '' : `?${targetQuery}`;
  return NextResponse.redirect(url, decision.status);
}

/**
 * Skip Next internals, the API surface and static files. Everything else —
 * including paths that will legitimately serve a route or a 404 — goes through
 * the resolver, which returns `next()` unless the path is a real legacy URL.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|media/|api/).*)'],
};
