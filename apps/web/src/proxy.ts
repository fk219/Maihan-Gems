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

function withStorefront(request: NextRequest, slug: string): Headers {
  const headers = new Headers(request.headers);
  headers.set('x-maihan-storefront', slug);
  return headers;
}

function isNgcCanonicalProductPath(pathname: string): boolean {
  const last = pathname.split('/').filter(Boolean).pop() ?? '';
  return /(?:-k\d+|-pr\d+|-j\d+|js\d+[a-z0-9]*-k\d+)$/i.test(last);
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split('/').filter(Boolean)[0] ?? '';

  if (SISTERS.has(first)) {
    const rest = pathname.slice(first.length + 1) || '/';
    const url = request.nextUrl.clone();
    url.pathname = rest === '' || rest === '/' ? '/' : rest;
    return NextResponse.rewrite(url, { request: { headers: withStorefront(request, first) } });
  }

  // NGC research storefront serves source-shaped product URLs on
  // /[variety]/[slug]; do not 301 those away to /products/{stripped-slug}.
  if (isNgcCanonicalProductPath(pathname)) {
    return NextResponse.next({ request: { headers: withStorefront(request, 'maihan') } });
  }

  const decision = resolver.resolve(pathname, search);
  if (decision === null) {
    return NextResponse.next({ request: { headers: withStorefront(request, 'maihan') } });
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
