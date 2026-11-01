import { NextRequest, NextResponse } from 'next/server';
import { FRESH_API_URL } from '../_session.js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  try {
    const upstream = await fetch(`${FRESH_API_URL}/api/v1/auth/request-reset`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: body.email ?? '' }),
    });
    const data = (await upstream.json().catch(() => ({}))) as { error?: string; token?: string };
    if (!upstream.ok) {
      return NextResponse.json({ error: data.error ?? 'Could not request a reset' }, { status: upstream.status || 400 });
    }
    // Dev transport: the token surfaces here; production delivers it by email.
    return NextResponse.json({ ok: true, dev_token: data.token });
  } catch {
    return NextResponse.json({ error: 'fresh-api unreachable' }, { status: 502 });
  }
}
