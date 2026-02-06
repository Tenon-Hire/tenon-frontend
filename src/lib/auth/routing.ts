import type { NextRequest } from 'next/server';

export type LoginMode = 'candidate' | 'recruiter';

const CANDIDATE_PREFIXES = ['/candidate-sessions', '/candidate'];
const AUTH_PREFIXES = ['/auth', '/api/auth'];
const DEFAULT_RETURN_TO = '/';

export function sanitizeReturnTo(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return DEFAULT_RETURN_TO;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_RETURN_TO;

  const decodeMaybe = (input: string): string | null => {
    try {
      return decodeURIComponent(input);
    } catch {
      return null;
    }
  };
  const candidates = [trimmed];
  const decodedOnce = decodeMaybe(trimmed);
  const decodedTwice =
    decodedOnce && decodedOnce !== trimmed ? decodeMaybe(decodedOnce) : null;
  if (decodedOnce && decodedOnce !== trimmed) candidates.push(decodedOnce);
  if (decodedTwice && decodedTwice !== decodedOnce)
    candidates.push(decodedTwice);

  const isUnsafe = (candidate: string) => {
    const lower = candidate.toLowerCase();
    return (
      /[\u0000-\u001F\u007F]/.test(candidate) ||
      candidate.includes('\\') ||
      !candidate.startsWith('/') ||
      candidate.startsWith('//') ||
      candidate.includes('://') ||
      lower.startsWith('javascript:') ||
      lower.startsWith('/javascript:') ||
      AUTH_PREFIXES.some(
        (prefix) =>
          lower === prefix ||
          lower.startsWith(`${prefix}/`) ||
          lower.startsWith(`${prefix}?`) ||
          lower.startsWith(`${prefix}#`),
      )
    );
  };

  if (candidates.some(isUnsafe)) return DEFAULT_RETURN_TO;
  return trimmed;
}

export function modeForPath(pathname: string): LoginMode {
  return CANDIDATE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    ? 'candidate'
    : 'recruiter';
}

type ReturnToInput = NextRequest | Location | URL | string | null | undefined;

export function buildReturnTo(input?: ReturnToInput): string {
  if (typeof input === 'string') return sanitizeReturnTo(input);
  if (input && typeof (input as NextRequest).nextUrl === 'object') {
    const url = (input as NextRequest).nextUrl;
    return sanitizeReturnTo(`${url.pathname}${url.search}`);
  }
  if (input instanceof URL)
    return sanitizeReturnTo(`${input.pathname}${input.search}`);
  if (input && typeof (input as Location).pathname === 'string') {
    const loc = input as Location;
    return sanitizeReturnTo(`${loc.pathname}${loc.search ?? ''}`);
  }
  if (typeof window !== 'undefined')
    return sanitizeReturnTo(
      `${window.location.pathname}${window.location.search}`,
    );
  return DEFAULT_RETURN_TO;
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
