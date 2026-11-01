import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';

/** Second step of admin login: exchange the 2FA challenge + code for a session. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as { challenge_token?: string; code?: string };
  try {
    const upstream = await fetch(`${FRESH_API_URL}/api/v1/admin/auth/2fa/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ challenge_token: body.challenge_token ?? '', code: body.code ?? '' }),
    });
    const data = (await upstream.json().catch(() => ({}))) as {
      error?: string;
      token?: string;
      admin?: { email: string; role: string };
    };
    if (!upstream.ok || !data.token) {
      return NextResponse.json({ error: data.error ?? 'Invalid code' }, { status: upstream.status || 401 });
    }
    const res = NextResponse.json({ ok: true, admin: data.admin });
    res.cookies.set('maihan_admin_session', data.token, {
      httpOnly: true, sameSite: 'strict', path: '/', maxAge: 12 * 60 * 60, secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'fresh-api unreachable' }, { status: 502 });
  }
}
