import { NextRequest, NextResponse } from 'next/server';
import { modeForPath, sanitizeReturnTo } from '@/lib/auth/routing';

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

function resolveCookieDomain(request: NextRequest) {
  const envDomain = process.env.TENON_AUTH0_COOKIE_DOMAIN;
  if (envDomain && envDomain.trim()) return envDomain.trim();
  const hostname = request.nextUrl.hostname;
  return hostname && hostname.includes('.') ? hostname : undefined;
}

export async function GET(req: NextRequest) {
  const returnTo = sanitizeReturnTo(
    req.nextUrl.searchParams.get('returnTo'),
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
  const domain = resolveCookieDomain(req);
  const deleteOptions = { path: '/' as const };
  req.cookies.getAll().forEach((cookie) => {
    if (!isAuthCookie(cookie.name)) return;
    res.cookies.delete(cookie.name, deleteOptions);
    if (domain) {
      res.cookies.delete(cookie.name, { ...deleteOptions, domain });
    }
  });
  return res;
}
