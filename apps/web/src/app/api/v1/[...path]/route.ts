/**
 * apps/web/src/app/api/v1/[...path]/route.ts
 *
 * The App Router mounting of the framework-free app API.
 *
 * Authority:
 *   - PROJECT_SOURCE_OF_TRUTH.md 12.2/13.2 ("api/ — route handlers") and
 *     technical_design/08: "the Phase 4 Next.js route handlers delegate to
 *     exactly this function (doc 08)". The handler surface lives in
 *     `src/api/**` (one `(Request) => Promise<Response>`); this file is
 *     transport-only delegation, never route logic.
 *
 * Two transport modes, selected by environment:
 *   - MAIHAN_API_URL set (deployment default): the request is FORWARDED to
 *     the API process (`node dist/api/server.js`, API_PORT). The Next
 *     process keeps zero database pools for API traffic and the API keeps
 *     its own cache, rate-limit and correlation concerns. This is the
 *     deployment-accurate seam: the storefront and the API are separate
 *     processes that a reverse proxy fronts.
 *   - MAIHAN_API_URL absent: requests are delegated IN-PROCESS to the wired
 *     `createCatalogApi` composition root (local single-process runs).
 *
 * What is forwarded: method, path + query, every client header except the
 * hop-by-hop pair (host, connection). One translation is added: the
 * httpOnly `maihan_client_ref` cookie (set only after the account API
 * verified the reference) is forwarded as the API's `x-customer-id` identity
 * header on account/favourites paths — client islands cannot read an
 * httpOnly cookie, so the storefront proxy carries it, exactly matching the
 * API's documented identity contract.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HOP_BY_HOP = new Set(['host', 'connection']);
const SPOOFABLE_IDENTITY_HEADERS = new Set([
  'x-admin-sub',
  'x-admin-role',
  'x-admin-session',
  'x-customer-id',
]);

/** Paths whose calls carry the verified client reference as the identity header. */
const IDENTITY_COOKIE_PREFIXES = ['/account', '/favorites', '/compare'];

function buildForwardHeaders(request: Request, path: string): Headers {
  const headers = new Headers();
  const isProd = process.env['MAIHAN_ENV'] === 'production';
  request.headers.forEach((value, name) => {
    const lower = name.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    if (isProd && SPOOFABLE_IDENTITY_HEADERS.has(lower)) return;
    headers.append(name, value);
  });
  if (IDENTITY_COOKIE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    const cookie = headers.get('cookie') ?? '';
    const match = cookie.match(/(?:^|;\s*)maihan_client_ref=([^;]+)/);
    if (match) headers.set('x-customer-id', decodeURIComponent(match[1] ?? ''));
  }
  return headers;
}

async function forward(request: Request, apiBaseUrl: string, path: string[]): Promise<Response> {
  const incoming = new URL(request.url);
  const joined = `/${path.join('/')}`;
  const target = `${apiBaseUrl.replace(/\/$/, '')}/api/v1${joined}${incoming.search}`;
  return fetch(new Request(target, {
    method: request.method,
    headers: buildForwardHeaders(request, joined),
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    // Node fetch (undici) requires duplex for streamed bodies; a buffered
    // ArrayBuffer body avoids the streamed form entirely.
    // @ts-expect-error duplex is not in the DOM RequestInit type.
    duplex: 'half',
  }));
}

async function delegate(request: Request, path: string[]): Promise<Response> {
  const apiBaseUrl = process.env['MAIHAN_API_URL']?.trim() || '';

  if (apiBaseUrl) {
    try {
      return await forward(request, apiBaseUrl, path);
    } catch {
      return NextResponse.json(
        { error: { code: 'BAD_GATEWAY', message: 'The Maihan API is unreachable.' } },
        { status: 502, headers: { 'cache-control': 'no-store' } },
      );
    }
  }

  const joined = `/${path.join('/')}`;
  const translated = new Request(request.url, {
    method: request.method,
    headers: buildForwardHeaders(request, joined),
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
  });
  const wired = await getWiredApi();
  return wired.api(translated);
}

let wiredPromise: Promise<{ api: (request: Request) => Promise<Response>; close(): Promise<void> }> | null = null;

function getWiredApi(): Promise<{ api: (request: Request) => Promise<Response>; close(): Promise<void> }> {
  if (wiredPromise === null) {
    wiredPromise = (async () => {
      const { wireApi } = await import('../../../../api/server.js');
      const wired = await wireApi();
      return { api: wired.api, close: wired.close };
    })();
  }
  return wiredPromise;
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await ctx.params;
  return delegate(request, path ?? []);
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await ctx.params;
  return delegate(request, path ?? []);
}

export async function PATCH(request: Request, ctx: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await ctx.params;
  return delegate(request, path ?? []);
}

export async function DELETE(request: Request, ctx: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await ctx.params;
  return delegate(request, path ?? []);
}
