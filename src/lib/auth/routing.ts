import type { NextRequest } from 'next/server';

export type LoginMode = 'candidate' | 'recruiter';

const CANDIDATE_PREFIXES = ['/candidate-sessions', '/candidate'];

function normalizeReturnTo(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return '/';
  const trimmed = value.trim();
  return trimmed ? trimmed : '/';
}

export function modeForPath(pathname: string): LoginMode {
  return CANDIDATE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    ? 'candidate'
    : 'recruiter';
}

type ReturnToInput = NextRequest | Location | URL | string | null | undefined;

export function buildReturnTo(input?: ReturnToInput): string {
  if (typeof input === 'string') return normalizeReturnTo(input);

  if (input && typeof (input as NextRequest).nextUrl === 'object') {
    const url = (input as NextRequest).nextUrl;
    return normalizeReturnTo(`${url.pathname}${url.search}`);
  }

  if (input instanceof URL) {
    return normalizeReturnTo(`${input.pathname}${input.search}`);
  }

  if (input && typeof (input as Location).pathname === 'string') {
    const loc = input as Location;
    return normalizeReturnTo(`${loc.pathname}${loc.search ?? ''}`);
  }

  if (typeof window !== 'undefined') {
    return normalizeReturnTo(
      `${window.location.pathname}${window.location.search}`,
    );
  }

  return '/';
}

export function buildLoginUrl(
  mode: LoginMode,
  returnTo?: string | ReturnToInput,
): string {
  const safeReturnTo = buildReturnTo(returnTo);
  const params = new URLSearchParams();
  params.set('mode', mode);
  params.set('returnTo', safeReturnTo);
  return `/auth/login?${params.toString()}`;
}

export function buildNotAuthorizedUrl(
  mode: LoginMode,
  returnTo?: string | ReturnToInput,
): string {
  const safeReturnTo = buildReturnTo(returnTo);
  const params = new URLSearchParams();
  params.set('mode', mode);
  params.set('returnTo', safeReturnTo);
  return `/not-authorized?${params.toString()}`;
}
