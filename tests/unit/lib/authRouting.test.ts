import { buildLoginUrl, sanitizeReturnTo } from '@/lib/auth/routing';

describe('sanitizeReturnTo', () => {
  it('allows safe relative paths', () => {
    expect(sanitizeReturnTo('/candidate/home')).toBe('/candidate/home');
    expect(sanitizeReturnTo('/recruiter/dashboard?x=1')).toBe(
      '/recruiter/dashboard?x=1',
    );
  });

  it('rejects protocol-relative and absolute urls', () => {
    expect(sanitizeReturnTo('//evil.com')).toBe('/');
    expect(sanitizeReturnTo('https://evil.com')).toBe('/');
  });

  it('rejects backslash variants', () => {
    expect(sanitizeReturnTo('/\\evil.com')).toBe('/');
    expect(sanitizeReturnTo('/evil\\path')).toBe('/');
    expect(sanitizeReturnTo('\\evil.com')).toBe('/');
  });

  it('rejects auth routes', () => {
    expect(sanitizeReturnTo('/auth')).toBe('/');
    expect(sanitizeReturnTo('/auth/callback')).toBe('/');
    expect(sanitizeReturnTo('/auth?next=/dashboard')).toBe('/');
    expect(sanitizeReturnTo('/api/auth/callback')).toBe('/');
  });

  it('trims whitespace and newlines', () => {
    expect(sanitizeReturnTo('  /dashboard\n')).toBe('/dashboard');
  });

  it('rejects control characters', () => {
    expect(sanitizeReturnTo('/dashboard\r\nSet-Cookie: x=y')).toBe('/');
  });

  it('rejects encoded and javascript variants', () => {
    expect(sanitizeReturnTo('/%2F%2Fevil.com')).toBe('/');
    expect(sanitizeReturnTo('/%2f%2fevil.com')).toBe('/');
    expect(sanitizeReturnTo('/%5Cevil.com')).toBe('/');
    expect(sanitizeReturnTo('javascript:alert(1)')).toBe('/');
    expect(sanitizeReturnTo('/%6A%61%76%61%73%63%72%69%70%74:alert(1)')).toBe(
      '/',
    );
    expect(sanitizeReturnTo('/dashboard%0d%0aSet-Cookie: x=y')).toBe('/');
  });

  it('sanitizes unsafe returnTo in login redirect builder', () => {
    const href = buildLoginUrl('recruiter', 'https://evil.com');
    expect(href.startsWith('/auth/login')).toBe(true);
    const url = new URL(href, 'http://test.local');
    expect(url.pathname).toBe('/auth/login');
    expect(url.searchParams.get('mode')).toBe('recruiter');
    expect(url.searchParams.get('returnTo')).toBe('/');
    expect(url.searchParams.get('returnTo')).not.toMatch(/^https?:/i);
  });
});
