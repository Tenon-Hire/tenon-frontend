type LoginMode = 'candidate' | 'recruiter';

function normalizeReturnTo(returnTo: string | null | undefined): string {
  if (typeof returnTo !== 'string') return '/';
  return returnTo.trim() || '/';
}

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
  params.set('returnTo', normalizeReturnTo(returnTo));
  if (mode) params.set('mode', mode);
  const connection = connectionForMode(mode);
  if (connection) params.set('connection', connection);

  const query = params.toString();
  return `/auth/login${query ? `?${query}` : ''}`;
}

export function buildLogoutHref(returnTo?: string): string {
  const base = '/auth/logout';
  if (!returnTo) return base;
  return `${base}?returnTo=${encodeURIComponent(normalizeReturnTo(returnTo))}`;
}

export type { LoginMode };
