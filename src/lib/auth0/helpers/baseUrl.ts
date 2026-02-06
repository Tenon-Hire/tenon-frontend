const resolveBaseUrl = () => {
  const candidates = [
    process.env.TENON_APP_BASE_URL,
    process.env.NEXT_PUBLIC_TENON_APP_BASE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : null,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      return new URL(raw);
    } catch {
      continue;
    }
  }
  return null;
};

export const buildRedirect = (path: string) => {
  const base =
    resolveBaseUrl() ??
    (process.env.NODE_ENV !== 'production'
      ? new URL('http://localhost:3000')
      : null);
  if (!base) {
    throw new Error(
      'TENON_APP_BASE_URL (or VERCEL_URL) must be set in production',
    );
  }
  return new URL(path, base);
};

export { resolveBaseUrl };
