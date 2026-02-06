import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveLogoutReturnTo } from '@/lib/auth/proxyUtils';

export function normalizeLogoutRedirect(
  request: NextRequest,
): NextResponse | null {
  if (request.nextUrl.pathname !== '/auth/logout') return null;

  const safeReturnTo = resolveLogoutReturnTo(request);
  const currentReturnTo = request.nextUrl.searchParams.get('returnTo');
  if (currentReturnTo === safeReturnTo) return null;

  const redirectUrl = new URL(request.url);
  redirectUrl.searchParams.set('returnTo', safeReturnTo);
  redirectUrl.hash = '';
  return NextResponse.redirect(redirectUrl);
}
