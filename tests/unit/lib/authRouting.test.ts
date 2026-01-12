import { sanitizeReturnTo } from '@/lib/auth/routing';

describe('sanitizeReturnTo', () => {
  it('allows safe relative paths', () => {
    expect(sanitizeReturnTo('/dashboard')).toBe('/dashboard');
    expect(sanitizeReturnTo('/candidate/session/abc?x=1')).toBe(
      '/candidate/session/abc?x=1',
    );
  });

  it('rejects protocol-relative and absolute urls', () => {
    expect(sanitizeReturnTo('//evil.com')).toBe('/dashboard');
    expect(sanitizeReturnTo('https://evil.com')).toBe('/dashboard');
  });

  it('rejects backslash variants', () => {
    expect(sanitizeReturnTo('/\\evil.com')).toBe('/dashboard');
    expect(sanitizeReturnTo('/evil\\path')).toBe('/dashboard');
  });

  it('rejects auth routes', () => {
    expect(sanitizeReturnTo('/auth')).toBe('/dashboard');
    expect(sanitizeReturnTo('/auth/callback')).toBe('/dashboard');
    expect(sanitizeReturnTo('/auth?next=/dashboard')).toBe('/dashboard');
    expect(sanitizeReturnTo('/api/auth/callback')).toBe('/dashboard');
  });

  it('trims whitespace and newlines', () => {
    expect(sanitizeReturnTo('  /dashboard\n')).toBe('/dashboard');
  });

  it('rejects control characters', () => {
    expect(sanitizeReturnTo('/dashboard\r\nSet-Cookie: x=y')).toBe(
      '/dashboard',
    );
  });
});
