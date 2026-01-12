import { NextRequest, NextResponse } from 'next/server';
import { modeForPath } from '@/lib/auth/routing';

const COOKIE_EXACT = new Set(['__session', 'appSession']);
const COOKIE_PREFIXES = [
  '__session__',
  'appSession__',
  'appSession.',
  '__txn_',
  '__FC',
];

function isAuthCookie(name: string) {
  if (COOKIE_EXACT.has(name)) return true;
  return COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function resolveSafeReturnTo(raw: string | null, request: NextRequest) {
  if (!raw) return '/dashboard';
  try {
    const base = new URL(request.url);
    const url = new URL(raw, base);
    if (url.origin !== base.origin) return '/dashboard';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/dashboard';
  }
}

export async function GET(req: NextRequest) {
  const returnTo = resolveSafeReturnTo(
    req.nextUrl.searchParams.get('returnTo'),
    req,
  );
  const rawMode = req.nextUrl.searchParams.get('mode');
  const mode =
    rawMode === 'candidate' || rawMode === 'recruiter'
      ? rawMode
      : modeForPath(returnTo.split('?')[0] || returnTo);

  const redirectUrl = new URL('/auth/error', req.url);
  redirectUrl.searchParams.set('returnTo', returnTo);
  redirectUrl.searchParams.set('mode', mode);
  redirectUrl.searchParams.set('cleared', '1');

  const res = NextResponse.redirect(redirectUrl);
  req.cookies.getAll().forEach((cookie) => {
    if (isAuthCookie(cookie.name)) {
      res.cookies.delete(cookie.name);
    }
  });
  return res;
}
