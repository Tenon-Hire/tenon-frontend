import { isAuthCookie, normalizeAuthCookieName } from '@/lib/auth/authCookies';

describe('authCookies helpers', () => {
  it('normalizes secure/host prefixes', () => {
    expect(normalizeAuthCookieName('__Secure-appSession')).toBe('appSession');
    expect(normalizeAuthCookieName('__Host-a0:state')).toBe('a0:state');
    expect(normalizeAuthCookieName('plain')).toBe('plain');
  });

  it('detects auth cookies by exact and prefix match', () => {
    expect(isAuthCookie('appSession')).toBe(true);
    expect(isAuthCookie('__Secure-appSession')).toBe(true);
    expect(isAuthCookie('__Host-a0:foobar')).toBe(true);
    expect(isAuthCookie('a0:state')).toBe(true);
    expect(isAuthCookie('other')).toBe(false);
  });
});
