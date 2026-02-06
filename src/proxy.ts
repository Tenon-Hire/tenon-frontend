import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth0, getSessionNormalized } from './lib/auth0';
import { extractPermissions } from './lib/auth0-claims';
import {
  isNextResponse,
  normalizeAccessToken,
  redirectToLogin,
  shouldSkipAuth,
} from './lib/auth/proxyUtils';
import { modeForPath } from './lib/auth/routing';
import { normalizeLogoutRedirect } from './proxy/redirects';
import { buildResponder, startPerfTimer } from './proxy/perf';
import { redirectSignedInHome, gateByRole } from './proxy/auth';
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApiPath = pathname === '/api' || pathname.startsWith('/api/');
  const logoutRedirect = normalizeLogoutRedirect(request);
  if (logoutRedirect) return logoutRedirect;
  const perfStart = startPerfTimer();
  const authResponse = await auth0.middleware(request);
  const responder = buildResponder({ authResponse, pathname, perfStart });
  const passThrough = () =>
    isNextResponse(authResponse)
      ? (authResponse as NextResponse)
      : NextResponse.next();

  if (isApiPath) return responder(NextResponse.next());
  const isRootOrLogin = pathname === '/' || pathname === '/auth/login';
  if (shouldSkipAuth(pathname) && !isRootOrLogin) {
    return responder(passThrough());
  }

  const session = await getSessionNormalized(request);
  if (shouldSkipAuth(pathname)) {
    const homeRedirect = redirectSignedInHome(session, isRootOrLogin, request);
    if (homeRedirect) return responder(homeRedirect);
    return responder(passThrough());
  }
  if (!session)
    return responder(
      redirectToLogin(request, modeForPath(request.nextUrl.pathname)),
    );

  const fallbackAccessToken = normalizeAccessToken(
    (session as { accessToken?: unknown }).accessToken,
  );
  const permissions = extractPermissions(session.user, fallbackAccessToken);
  const roleRedirect = gateByRole(pathname, permissions, request);
  if (roleRedirect) return responder(roleRedirect);

  return responder(passThrough());
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
