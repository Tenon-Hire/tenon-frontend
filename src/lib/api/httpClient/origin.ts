export function isSameOriginRequest(url: string): boolean {
  if (typeof window !== 'undefined' && window.location?.origin) {
    try {
      const base = window.location.origin;
      return new URL(url, base).origin === base;
    } catch {
      return url.startsWith('/') && !url.startsWith('//');
    }
  }
  return url.startsWith('/') && !url.startsWith('//');
}
