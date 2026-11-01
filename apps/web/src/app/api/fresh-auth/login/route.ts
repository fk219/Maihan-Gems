import { NextRequest, NextResponse } from 'next/server';
import { FRESH_API_URL, setCustomerCookie } from '../_session.js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  try {
    const upstream = await fetch(`${FRESH_API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: body.email ?? '', password: body.password ?? '' }),
    });
    const data = (await upstream.json().catch(() => ({}))) as { error?: string; token?: string; email?: string };
    if (!upstream.ok || !data.token) {
      return NextResponse.json({ error: data.error ?? 'Invalid email or password' }, { status: upstream.status || 401 });
    }
    const res = NextResponse.json({ ok: true, email: data.email });
    setCustomerCookie(res, data.token);
    return res;
  } catch {
    return NextResponse.json({ error: 'fresh-api unreachable' }, { status: 502 });
  }
}
