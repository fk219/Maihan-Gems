import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';

/** Same-origin proxy for images stored by fresh-api (local media driver). */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await ctx.params;
  const res = await fetch(`${FRESH_API_URL}/media/${path.map(encodeURIComponent).join('/')}`, {
    cache: 'no-store',
  }).catch(() => null);
  if (!res || !res.ok) return new NextResponse(null, { status: 404 });
  return new NextResponse(res.body, {
    status: 200,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
