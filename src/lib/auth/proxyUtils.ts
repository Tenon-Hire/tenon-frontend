import type { NextRequest, NextResponse } from 'next/server';
import { NextResponse as Next } from 'next/server';
import { buildLoginUrl, buildNotAuthorizedUrl, modeForPath } from './routing';

export const PUBLIC_PATHS = new Set([
  '/',
  '/auth/login',
  '/auth/logout',
  '/not-authorized',
]);
export const PUBLIC_PREFIXES = ['/auth'];
export const CANDIDATE_PREFIXES = ['/candidate-sessions', '/candidate'];
export const RECRUITER_PREFIXES = ['/dashboard'];

export const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.has(pathname) ||
  PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

export const resolveLogoutReturnTo = (request: NextRequest) =>
  new URL('/', request.nextUrl.origin).toString();

export const redirect = (to: string, request: NextRequest) =>
  Next.redirect(new URL(to, request.url));

export const redirectToLogin = (
  request: NextRequest,
  mode?: 'candidate' | 'recruiter',
) =>
  redirect(
    buildLoginUrl(mode ?? modeForPath(request.nextUrl.pathname), request),
    request,
  );

export const redirectNotAuthorized = (
  request: NextRequest,
  mode: 'candidate' | 'recruiter',
) => redirect(buildNotAuthorizedUrl(mode, request), request);

export const shouldSkipAuth = (pathname: string) => isPublicPath(pathname);
export const requiresCandidateAccess = (pathname: string) =>
  CANDIDATE_PREFIXES.some((p) => pathname.startsWith(p));
export const requiresRecruiterAccess = (pathname: string) =>
  RECRUITER_PREFIXES.some((p) => pathname.startsWith(p));

export function normalizeAccessToken(raw: unknown): string | null {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const maybe =
      (raw as { token?: unknown }).token ??
      (raw as { accessToken?: unknown }).accessToken;
    return typeof maybe === 'string' ? maybe : null;
  }
  return null;
}

export function isNextResponse(value: unknown): value is NextResponse {
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
