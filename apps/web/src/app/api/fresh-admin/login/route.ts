import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';

/**
 * Admin login: verifies the DB admin user (fresh.admin_users) through
 * fresh-api's session endpoint and stores the session token httpOnly.
 * The legacy env-password endpoint is dev-only and not used here.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  try {
    const upstream = await fetch(`${FRESH_API_URL}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: body.email ?? '', password: body.password ?? '' }),
    });
    const data = (await upstream.json().catch(() => ({}))) as {
      error?: string;
      token?: string;
      admin?: { email: string; role: string };
    };
    if (!upstream.ok || !data.token) {
      return NextResponse.json({ error: data.error ?? 'Invalid email or password' }, { status: upstream.status || 401 });
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

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get('maihan_admin_session')?.value;
  if (token) {
    await fetch(`${FRESH_API_URL}/api/v1/admin/auth/logout`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('maihan_admin_session');
  return res;
}
