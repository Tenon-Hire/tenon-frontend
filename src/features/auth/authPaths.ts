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

export function buildLoginHref(returnTo?: string, mode?: LoginMode): string {
  const params = new URLSearchParams();
  params.set('returnTo', buildReturnTo(returnTo));
  const resolvedMode = mode ?? 'recruiter';
  params.set('mode', resolvedMode);
  const connection = connectionForMode(resolvedMode);
  if (connection) params.set('connection', connection);

  const query = params.toString();
  return `/auth/login${query ? `?${query}` : ''}`;
}

export function buildLogoutHref(returnTo?: string): string {
  const base = '/auth/logout';
  if (!returnTo) return base;
  return `${base}?returnTo=${encodeURIComponent(buildReturnTo(returnTo))}`;
}

export type { LoginMode };
export { modeForPath };
