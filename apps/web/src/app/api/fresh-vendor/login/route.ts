import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';

/** Vendor login: verify code+key against fresh-api, store both httpOnly. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as { code?: string; key?: string };
  try {
    const upstream = await fetch(
      `${FRESH_API_URL}/api/v1/vendors/${encodeURIComponent(body.code ?? '')}/submissions`,
      { headers: { 'x-vendor-key': body.key ?? '' } },
    );
    if (!upstream.ok) {
      return NextResponse.json({ error: 'invalid vendor code/key' }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true, vendor: body.code });
    res.cookies.set('maihan_vendor_code', body.code ?? '', {
      httpOnly: true, sameSite: 'strict', path: '/', maxAge: 30 * 24 * 60 * 60, secure: process.env.NODE_ENV === 'production',
    });
    res.cookies.set('maihan_vendor_key', body.key ?? '', {
      httpOnly: true, sameSite: 'strict', path: '/', maxAge: 30 * 24 * 60 * 60, secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'fresh-api unreachable' }, { status: 502 });
  }
}

export async function DELETE(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('maihan_vendor_code');
  res.cookies.delete('maihan_vendor_key');
  return res;
}
