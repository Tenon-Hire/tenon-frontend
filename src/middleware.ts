import { NextResponse, type NextRequest } from 'next/server';
import { auth0, getSessionNormalized } from '@/lib/auth0';
import { extractPermissions, hasPermission } from '@/lib/auth0-claims';
import {
  loginModeForPath,
  requiresCandidateAccess,
  requiresRecruiterAccess,
} from '@/lib/auth/access';

const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/auth/login',
  '/auth/logout',
  '/not-authorized',
]);
const PUBLIC_PREFIXES = ['/auth'];
const API_PREFIX = '/api';

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function redirect(to: string, request: NextRequest) {
  return NextResponse.redirect(new URL(to, request.url));
}

function buildLoginRedirect(request: NextRequest) {
  const url = new URL('/login', request.url);
  url.searchParams.set(
    'returnTo',
    request.nextUrl.pathname + request.nextUrl.search,
  );
  url.searchParams.set('mode', loginModeForPath(request.nextUrl.pathname));
  return NextResponse.redirect(url);
}

function redirectNotAuthorized(
  mode: 'candidate' | 'recruiter',
  request: NextRequest,
) {
  const url = new URL('/not-authorized', request.url);
  url.searchParams.set('mode', mode);
  url.searchParams.set(
    'returnTo',
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.redirect(url);
}

function normalizeAccessToken(raw: unknown): string | null {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const maybeToken =
      (raw as { token?: unknown }).token ??
      (raw as { accessToken?: unknown }).accessToken;
    return typeof maybeToken === 'string' ? maybeToken : null;
  }
  return null;
}

function mergeAuthCookies(
  target: NextResponse,
  authResponse: NextResponse,
): NextResponse {
  authResponse.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
  return target;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const authResponse = await auth0.middleware(request);

  if (pathname.startsWith(API_PREFIX)) {
    return authResponse;
  }

  if (isPublicPath(pathname)) {
    return authResponse;
  }

  const session = await getSessionNormalized(request);

  if (!session) {
    return mergeAuthCookies(buildLoginRedirect(request), authResponse);
  }

  const fallbackAccessToken = normalizeAccessToken(
    (session as { accessToken?: unknown }).accessToken,
  );
  const permissions = extractPermissions(session.user, fallbackAccessToken);
  const wantsRecruiter = requiresRecruiterAccess(pathname);
  const wantsCandidate = requiresCandidateAccess(pathname);

  if (wantsRecruiter && !hasPermission(permissions, 'recruiter:access')) {
    return mergeAuthCookies(
      redirectNotAuthorized('recruiter', request),
      authResponse,
    );
  }

  if (wantsCandidate && !hasPermission(permissions, 'candidate:access')) {
    return mergeAuthCookies(
      redirectNotAuthorized('candidate', request),
      authResponse,
    );
  }

  if (pathname === '/') {
    if (hasPermission(permissions, 'recruiter:access')) {
      return mergeAuthCookies(redirect('/dashboard', request), authResponse);
    }
    if (hasPermission(permissions, 'candidate:access')) {
      return mergeAuthCookies(
        redirect('/candidate/dashboard', request),
        authResponse,
      );
    }
  }

  return authResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
