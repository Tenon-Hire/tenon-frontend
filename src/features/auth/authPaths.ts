function normalizeReturnTo(returnTo: string | null | undefined): string {
  if (typeof returnTo !== 'string') return '/';
  return returnTo.trim() || '/';
}

export function buildLoginHref(returnTo?: string): string {
  return `/auth/login?returnTo=${encodeURIComponent(normalizeReturnTo(returnTo))}`;
}

export function buildLogoutHref(returnTo?: string): string {
  const base = '/auth/logout';
  if (!returnTo) return base;
  return `${base}?returnTo=${encodeURIComponent(normalizeReturnTo(returnTo))}`;
}
