import { buildReturnTo, modeForPath, type LoginMode } from '@/lib/auth/routing';

function connectionForMode(mode?: LoginMode): string | null {
  if (mode === 'candidate') {
    return process.env.NEXT_PUBLIC_TENON_AUTH0_CANDIDATE_CONNECTION ?? null;
  }
  if (mode === 'recruiter') {
    return process.env.NEXT_PUBLIC_TENON_AUTH0_RECRUITER_CONNECTION ?? null;
  }
  return null;
}

function resolveLogoutOrigin(): string | null {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  const candidates = [
    process.env.NEXT_PUBLIC_TENON_APP_BASE_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : null,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    try {
      return new URL(raw).origin;
    } catch {
      continue;
    }
  }

  return null;
}

function buildAbsoluteReturnTo(returnTo?: string): string | null {
  const origin = resolveLogoutOrigin();
  if (!origin) return null;
  const safePath = buildReturnTo(returnTo);
  const url = new URL(safePath, origin);
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function buildLoginHref(returnTo?: string, mode?: LoginMode): string {
  return buildAuthHref({ returnTo, mode });
}

export function buildSignupHref(returnTo?: string, mode?: LoginMode): string {
  return buildAuthHref({ returnTo, mode, screenHint: 'signup' });
}

function buildAuthHref({
  returnTo,
  mode,
  screenHint,
}: {
  returnTo?: string;
  mode?: LoginMode;
  screenHint?: 'signup';
}): string {
  const params = new URLSearchParams();
  params.set('returnTo', buildReturnTo(returnTo));
  const resolvedMode = mode ?? 'recruiter';
  params.set('mode', resolvedMode);
  const connection = connectionForMode(resolvedMode);
  if (connection) params.set('connection', connection);
  if (screenHint) params.set('screen_hint', screenHint);

  const query = params.toString();
  return `/auth/login${query ? `?${query}` : ''}`;
}

export function buildLogoutHref(returnTo?: string): string {
  const base = '/auth/logout';
  const absoluteReturnTo = buildAbsoluteReturnTo(returnTo);
  if (!absoluteReturnTo) return base;
  return `${base}?returnTo=${encodeURIComponent(absoluteReturnTo)}`;
}

export function buildClearAuthHref(
  returnTo?: string,
  mode?: LoginMode,
): string {
  const params = new URLSearchParams();
  params.set('returnTo', buildReturnTo(returnTo));
  if (mode) params.set('mode', mode);
  const query = params.toString();
  return `/auth/clear${query ? `?${query}` : ''}`;
}

export type { LoginMode };
export { modeForPath };
