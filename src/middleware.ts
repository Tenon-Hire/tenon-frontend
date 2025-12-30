import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';

const PUBLIC_PATHS = new Set(['/', '/auth/login', '/auth/logout']);
const PUBLIC_PREFIXES = ['/auth', '/candidate-sessions'];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function redirect(to: string, request: NextRequest) {
  return NextResponse.redirect(new URL(to, request.url));
}

function buildLoginRedirect(request: NextRequest) {
  const url = new URL('/auth/login', request.url);
  url.searchParams.set(
    'returnTo',
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.redirect(url);
}

function shouldSkipAuth(pathname: string) {
  if (pathname.startsWith('/api/')) return true;
  if (isPublicPath(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const authResponse = await auth0.middleware(request);

  if (shouldSkipAuth(pathname)) return authResponse;

  const session = await auth0.getSession(request);
  if (!session) return buildLoginRedirect(request);

  if (pathname === '/' || pathname === '/auth/login') {
    return redirect('/dashboard', request);
  }

  return authResponse;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
