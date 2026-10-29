/**
 * F3-commerce — same-origin proxy to fresh-api (port 3010).
 *
 * Why a proxy: fresh-api binds to 127.0.0.1 and honours bearer tokens /
 * vendor keys. Browsing from the web app would be cross-origin, so the web
 * app forwards through this handler, attaching the admin session or vendor
 * key from httpOnly cookies. Nothing secret reaches the client bundle.
 *
 * The client never talks to fresh-api directly.
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';

async function forward(req: NextRequest, path: string[]): Promise<NextResponse> {
  const method = req.method.toUpperCase();
  const search = req.nextUrl.search;
  const url = `${FRESH_API_URL}/api/v1/${path.join('/')}${search}`;

  const headers: Record<string, string> = {};
  const adminCookie = req.cookies.get('maihan_admin_session')?.value;
  const adminLegacy = req.cookies.get('maihan_admin')?.value;
  const adminToken = adminCookie ?? adminLegacy;
  if (adminToken) headers['authorization'] = `Bearer ${adminToken}`;

  const vendorCode = req.cookies.get('maihan_vendor_code')?.value;
  const vendorKey = req.cookies.get('maihan_vendor_key')?.value;
  if (vendorCode) headers['x-vendor-code'] = vendorCode;
  if (vendorKey) headers['x-vendor-key'] = vendorKey;

  const contentType = req.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;

  const init: RequestInit = { method, headers, cache: 'no-store' };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(url, init);
    const body = await upstream.arrayBuffer();
    const res = new NextResponse(body, { status: upstream.status });
    res.headers.set('content-type', upstream.headers.get('content-type') ?? 'application/json');
    return res;
  } catch (e) {
    return NextResponse.json({ error: 'fresh-api unreachable' }, { status: 502 });
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function PATCH(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function DELETE(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;
  return forward(req, path);
}
