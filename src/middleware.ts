import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth0, getSessionNormalized } from './lib/auth0';
import { extractPermissions, hasPermission } from './lib/auth0-claims';
import {
  buildLoginUrl,
  buildNotAuthorizedUrl,
  modeForPath,
} from './lib/auth/routing';
import { mergeResponseCookies } from './lib/server/bffAuth';

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

function redirectToLogin(
  request: NextRequest,
  mode?: 'candidate' | 'recruiter',
) {
  const url = buildLoginUrl(
    mode ?? modeForPath(request.nextUrl.pathname),
    request,
  );
  return redirect(url, request);
}

function redirectNotAuthorized(
  request: NextRequest,
  mode: 'candidate' | 'recruiter',
) {
  const url = buildNotAuthorizedUrl(mode, request);
  return redirect(url, request);
}

function shouldSkipAuth(pathname: string) {
  if (isPublicPath(pathname)) return true;
  return false;
}

function requiresCandidateAccess(pathname: string) {
  return CANDIDATE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function requiresRecruiterAccess(pathname: string) {
  return RECRUITER_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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

function isNextResponse(value: unknown): value is NextResponse {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'status' in (value as Record<string, unknown>) &&
    typeof (value as { status: unknown }).status === 'number' &&
    'cookies' in (value as Record<string, unknown>) &&
    typeof (value as { cookies?: unknown }).cookies === 'object' &&
    typeof (value as { cookies: { getAll?: unknown } }).cookies.getAll ===
      'function' &&
    'headers' in (value as Record<string, unknown>) &&
    typeof (value as { headers?: unknown }).headers === 'object' &&
    typeof (value as { headers: { get?: unknown } }).headers.get === 'function',
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApiPath = pathname === '/api' || pathname.startsWith('/api/');

  const perfStart = process.env.TENON_DEBUG_PERF ? Date.now() : null;
  const authResponse = await auth0.middleware(request);
  const responder = (resp: NextResponse) => {
    if (isNextResponse(authResponse)) {
      mergeResponseCookies(authResponse, resp);
    }
    if (perfStart !== null) {
      // eslint-disable-next-line no-console
      console.log(
        `[perf:middleware] ${pathname} -> ${resp.status} ${Date.now() - perfStart}ms`,
      );
    }
    return resp;
  };

  if (isApiPath) {
    return responder(NextResponse.next());
  }

  const isRootOrLogin = pathname === '/' || pathname === '/auth/login';

  if (shouldSkipAuth(pathname) && !isRootOrLogin) {
    const pass = isNextResponse(authResponse)
      ? (authResponse as NextResponse)
      : NextResponse.next();
    return responder(pass);
  }

  const session = await getSessionNormalized(request);

  if (shouldSkipAuth(pathname)) {
    if (session && isRootOrLogin) {
      const perms = extractPermissions(
        session.user,
        normalizeAccessToken(
          (session as { accessToken?: unknown }).accessToken,
        ),
      );
      if (hasPermission(perms, 'recruiter:access')) {
        return responder(redirect('/dashboard', request));
      }
      if (hasPermission(perms, 'candidate:access')) {
        return responder(redirect('/candidate/dashboard', request));
      }
    }
    const pass = isNextResponse(authResponse)
      ? (authResponse as NextResponse)
      : NextResponse.next();
    return responder(pass);
  }

  if (!session)
    return responder(
      redirectToLogin(request, modeForPath(request.nextUrl.pathname)),
    );

  const fallbackAccessToken = normalizeAccessToken(
    (session as { accessToken?: unknown }).accessToken,
  );
  const permissions = extractPermissions(session.user, fallbackAccessToken);
  const wantsRecruiter = requiresRecruiterAccess(pathname);
  const wantsCandidate = requiresCandidateAccess(pathname);

  if (wantsRecruiter && !hasPermission(permissions, 'recruiter:access')) {
    return responder(redirectNotAuthorized(request, 'recruiter'));
  }

  if (wantsCandidate && !hasPermission(permissions, 'candidate:access')) {
    return responder(redirectNotAuthorized(request, 'candidate'));
  }

  const pass = isNextResponse(authResponse)
    ? (authResponse as NextResponse)
    : NextResponse.next();
  return responder(pass);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
