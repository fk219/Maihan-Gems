import { NextRequest, NextResponse } from 'next/server';
import { FRESH_API_URL, setCustomerCookie } from '../_session.js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const upstream = await fetch(`${FRESH_API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await upstream.json().catch(() => ({}))) as { error?: string; token?: string; email?: string; verification_token?: string };
    if (!upstream.ok || !data.token) {
      return NextResponse.json({ error: data.error ?? 'Could not create the account' }, { status: upstream.status || 400 });
    }
    const res = NextResponse.json({ ok: true, email: data.email, dev_verification_token: data.verification_token });
    setCustomerCookie(res, data.token);
    return res;
  } catch {
    return NextResponse.json({ error: 'fresh-api unreachable' }, { status: 502 });
  }
}
