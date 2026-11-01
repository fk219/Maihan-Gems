import { NextRequest, NextResponse } from 'next/server';
import { FRESH_API_URL, clearCustomerCookie } from '../_session.js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get('maihan_customer_session')?.value;
  if (token) {
    await fetch(`${FRESH_API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }
  const res = NextResponse.json({ ok: true });
  clearCustomerCookie(res);
  return res;
}
