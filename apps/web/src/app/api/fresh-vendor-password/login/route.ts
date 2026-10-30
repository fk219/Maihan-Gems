import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';

/**
 * Vendor password login: verifies against fresh-api vendor auth, stores
 * the session token httpOnly so the dashboard proxy can forward it.
 * The vendor's code is stored alongside for the proxy routes.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  try {
    const upstream = await fetch(`${FRESH_API_URL}/api/v1/vendor/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: body.email ?? '', password: body.password ?? '' }),
    });
    if (!upstream.ok) {
      const data = (await upstream.json().catch(() => ({}))) as { error?: string };
      return NextResponse.json({ error: data.error ?? 'invalid email or password' }, { status: 401 });
    }
    const data = (await upstream.json()) as { token: string; vendor: { code: string; name: string } };
    const res = NextResponse.json({ ok: true, vendor: data.vendor });
    res.cookies.set('maihan_vendor_session', data.token, {
      httpOnly: true, sameSite: 'strict', path: '/', maxAge: 30 * 24 * 60 * 60, secure: process.env.NODE_ENV === 'production',
    });
    res.cookies.set('maihan_vendor_code', data.vendor.code, {
      httpOnly: true, sameSite: 'strict', path: '/', maxAge: 30 * 24 * 60 * 60, secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'fresh-api unreachable' }, { status: 502 });
  }
}

export async function DELETE(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('maihan_vendor_session');
  res.cookies.delete('maihan_vendor_code');
  return res;
}
