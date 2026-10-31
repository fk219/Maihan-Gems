import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';

/**
 * First-time vendor password setup. The vendor proves possession of the
 * one-time API key issued at onboarding approval, sets a password, and gets
 * the same httpOnly session the login route issues.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as {
    vendor_code?: string;
    api_key?: string;
    password?: string;
  };
  try {
    const upstream = await fetch(`${FRESH_API_URL}/api/v1/vendor/auth/setup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        vendor_code: body.vendor_code ?? '',
        api_key: body.api_key ?? '',
        password: body.password ?? '',
      }),
    });
    const data = (await upstream.json().catch(() => ({}))) as {
      error?: string;
      token?: string;
      vendor?: { code: string; name: string };
    };
    if (!upstream.ok || !data.token || !data.vendor) {
      return NextResponse.json({ error: data.error ?? 'Could not set up access' }, { status: upstream.status || 401 });
    }
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
