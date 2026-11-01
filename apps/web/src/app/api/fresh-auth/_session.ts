import { NextResponse } from 'next/server';

export const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';

export function setCustomerCookie(res: NextResponse, token: string): void {
  res.cookies.set('maihan_customer_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === 'production',
  });
}

export function clearCustomerCookie(res: NextResponse): void {
  res.cookies.delete('maihan_customer_session');
}
