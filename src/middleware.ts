import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth0, getSessionNormalized } from './lib/auth0';
import { extractPermissions, hasPermission } from './lib/auth0-claims';

const PUBLIC_PATHS = new Set([
  '/',
  '/auth/login',
  '/auth/logout',
  '/not-authorized',
]);
const PUBLIC_PREFIXES = ['/auth'];
const CANDIDATE_PREFIXES = ['/candidate-sessions', '/candidate'];
const RECRUITER_PREFIXES = ['/dashboard'];

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
  url.searchParams.set('mode', loginModeForPath(request.nextUrl.pathname));
  return NextResponse.redirect(url);
}

function shouldSkipAuth(pathname: string) {
  if (pathname.startsWith('/api/')) return true;
  if (isPublicPath(pathname)) return true;
  return false;
}

function requiresCandidateAccess(pathname: string) {
  return CANDIDATE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function requiresRecruiterAccess(pathname: string) {
  return RECRUITER_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function loginModeForPath(pathname: string): 'candidate' | 'recruiter' {
  return requiresCandidateAccess(pathname) ? 'candidate' : 'recruiter';
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

async function optionalAccessToken(): Promise<string | null> {
  try {
    const tokenResult = await auth0.getAccessToken();
    if (!tokenResult) return null;
    if (typeof tokenResult === 'string') return tokenResult;
    const maybeToken =
      (tokenResult as { token?: string }).token ??
      (tokenResult as { accessToken?: string }).accessToken;
    return typeof maybeToken === 'string' ? maybeToken : null;
  } catch {
    return null;
  }
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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const authResponse = await auth0.middleware(request);

  if (shouldSkipAuth(pathname)) return authResponse;

  const session = await getSessionNormalized(request);
  if (!session) return buildLoginRedirect(request);

  const fallbackAccessToken =
    normalizeAccessToken((session as { accessToken?: unknown }).accessToken) ??
    (await optionalAccessToken());
  const permissions = extractPermissions(session.user, fallbackAccessToken);
  const wantsRecruiter = requiresRecruiterAccess(pathname);
  const wantsCandidate = requiresCandidateAccess(pathname);

  if (wantsRecruiter && !hasPermission(permissions, 'recruiter:access')) {
    return redirectNotAuthorized('recruiter', request);
  }

  if (wantsCandidate && !hasPermission(permissions, 'candidate:access')) {
    return redirectNotAuthorized('candidate', request);
  }

  if (pathname === '/' || pathname === '/auth/login') {
    if (hasPermission(permissions, 'recruiter:access')) {
      return redirect('/dashboard', request);
    }
    if (hasPermission(permissions, 'candidate:access')) {
      return redirect('/candidate/dashboard', request);
    }
  }

  return authResponse;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
