import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';

/** Admin login: verify against fresh-api, store the session token httpOnly. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  try {
    const upstream = await fetch(`${FRESH_API_URL}/api/v1/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: body.password ?? '' }),
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'invalid admin password' }, { status: 401 });
    }
    const data = (await upstream.json()) as { token: string };
    const res = NextResponse.json({ ok: true });
    res.cookies.set('maihan_admin_session', data.token, {
      httpOnly: true, sameSite: 'strict', path: '/', maxAge: 12 * 60 * 60, secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'fresh-api unreachable' }, { status: 502 });
  }
}

export async function DELETE(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('maihan_admin_session');
  return res;
}
