const COOKIE_EXACT = new Set(['appSession']);
const COOKIE_PREFIXES = ['a0:'];

export function normalizeAuthCookieName(name: string) {
  if (name.startsWith('__Secure-')) return name.slice('__Secure-'.length);
  if (name.startsWith('__Host-')) return name.slice('__Host-'.length);
  return name;
}

export function isAuthCookie(name: string) {
  const normalized = normalizeAuthCookieName(name);
  if (COOKIE_EXACT.has(normalized)) return true;
  return COOKIE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
