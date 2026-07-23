import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isTokenExpired } from '@/lib/auth/session';

const AUTH_COOKIE = 'sendam_auth_token';

const PUBLIC_PATHS = ['/login', '/register', '/pending', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const tokenExpired = Boolean(token && isTokenExpired(token));
  const hasValidToken = Boolean(token && !tokenExpired);

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!hasValidToken && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    if (tokenExpired) {
      loginUrl.searchParams.set('reason', 'session-expired');
    }
    loginUrl.searchParams.set('from', pathname);
    const response = NextResponse.redirect(loginUrl);
    if (tokenExpired) {
      response.cookies.delete(AUTH_COOKIE);
    }
    return response;
  }

  if (hasValidToken && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const response = NextResponse.next();
  if (tokenExpired) {
    response.cookies.delete(AUTH_COOKIE);
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|brand/.*|favicon.ico|icon.*|apple-icon.*|manifest.*|locales/.*|sw\\.js|workbox.*).*)',
  ],
};
