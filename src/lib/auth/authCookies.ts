const COOKIE_EXACT = new Set(['__session', 'appSession']);
const COOKIE_PREFIXES = [
  '__session__',
  'appSession__',
  'appSession.',
  '__txn_',
  '__FC',
  'a0:',
];

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
