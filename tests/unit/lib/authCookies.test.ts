import { isAuthCookie } from '@/lib/auth/authCookies';

describe('isAuthCookie', () => {
  it('matches auth cookies with secure/host prefixes', () => {
    expect(isAuthCookie('__Secure-a0:state')).toBe(true);
    expect(isAuthCookie('__Secure-a0:nonce')).toBe(true);
    expect(isAuthCookie('__Host-appSession')).toBe(true);
    expect(isAuthCookie('__Secure-appSession')).toBe(true);
    expect(isAuthCookie('a0:nonce')).toBe(true);
    expect(isAuthCookie('appSession')).toBe(true);
  });

  it('does not match unrelated cookies', () => {
    expect(isAuthCookie('session')).toBe(false);
    expect(isAuthCookie('__Secure-analytics')).toBe(false);
    expect(isAuthCookie('__FCxxxx')).toBe(false);
    expect(isAuthCookie('__txn_xxx')).toBe(false);
    expect(isAuthCookie('__Host-foo')).toBe(false);
  });
});
