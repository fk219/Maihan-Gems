import { NextResponse, type NextRequest } from 'next/server';

const SISTERS = new Set(['sapphire', 'ruby', 'emerald']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split('/').filter(Boolean)[0] ?? '';
  const headers = new Headers(request.headers);

  if (SISTERS.has(first)) {
    headers.set('x-maihan-storefront', first);
    const rest = pathname.slice(first.length + 1) || '/';
    const url = request.nextUrl.clone();
    url.pathname = rest === '' || rest === '/' ? '/' : rest;
    return NextResponse.rewrite(url, { request: { headers } });
  }

  headers.set('x-maihan-storefront', 'maihan');
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|media/|api/).*)'],
};
