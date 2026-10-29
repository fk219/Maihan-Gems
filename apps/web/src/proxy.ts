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

/** Real first-segment app routes (never 404'd at the edge). */
const KNOWN_FIRST_SEGMENTS = new Set([
  'browse', 'shop', 'gemstones', 'varieties', 'colour', 'pairs', 'settings',
  'jewellery', 'design-your-own', 'search', 'compare', 'favorites', 'cart',
  'checkout', 'about', 'education', 'blog', 'policy', 'showrooms', 'contact',
  'demo', 'concierge', 'card-preview', 'admin', 'vendor', 'account',
  'product', 'products', 'ar', 'api', '_next', 'favicon.ico', 'media',
  'financing', 'protection-plan', 'ai-gemologist', 'robots.txt', 'sitemap.xml',
]);

function isSisterPrefix(first: string): boolean {
  return SISTERS.has(first) || /-(?:gemstones|gemstone-pairs|gemstone-rings|earrings|pendants|bracelets|necklaces|rings|settings)$/.test(first);
}

/** Variety-slug cache (5-min TTL) — middleware runs before the app router. */
let varietyCache: { slugs: Set<string>; at: number } | null = null;
async function getKnownVarietySlugs(): Promise<Set<string>> {
  if (varietyCache && Date.now() - varietyCache.at < 5 * 60 * 1000) return varietyCache.slugs;
  try {
    const res = await fetch(`${process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010'}/api/v1/catalogue/varieties`, {
      cache: 'no-store',
    });
    if (!res.ok) return new Set(); // API down → let the app router decide
    const data = (await res.json()) as { items: Array<{ slug: string }> };
    varietyCache = { slugs: new Set(data.items.map((v) => v.slug)), at: Date.now() };
    return varietyCache.slugs;
  } catch {
    return new Set();
  }
}

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

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (!hostAllowed(request)) {
    return new NextResponse('Forbidden host.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0] ?? '';

  // Soft-404 guard: single-segment paths that are NOT a known app route are
  // either a real variety slug (86 in the registry — checked against the
  // cached registry, 5-min TTL) or a typo. Unknown → true 404 from the edge,
  // before any layout shell can stream a 200.
  if (segments.length === 1 && first && !KNOWN_FIRST_SEGMENTS.has(first) && !isSisterPrefix(first)) {
    const known = await getKnownVarietySlugs();
    if (!known.has(first)) {
      return new NextResponse(null, { status: 404 });
    }
  }

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
