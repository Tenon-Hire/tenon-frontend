import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';

const PUBLIC_PATHS = new Set(['/', '/login', '/logout']);
const PUBLIC_PREFIXES = ['/auth', '/candidate'];

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

export async function middleware(request: NextRequest) {
  const authRes = await auth0.middleware(request);
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/api/')) return authRes;

  const session = await auth0.getSession(request);

  if (session && (pathname === '/' || pathname === '/login')) {
    return redirect('/dashboard', request);
  }

  if (isPublicPath(pathname)) return authRes;

  if (!session) {
    return buildLoginRedirect(request);
  }

  return authRes;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
