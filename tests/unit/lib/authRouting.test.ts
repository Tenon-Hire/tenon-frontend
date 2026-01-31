import {
  buildLoginUrl,
  buildReturnTo,
  sanitizeReturnTo,
} from '@/lib/auth/routing';

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

  it('handles malformed encoding and double-decoding variants', () => {
    expect(sanitizeReturnTo('/%E0%A4%A')).toBe('/%E0%A4%A');
    expect(sanitizeReturnTo('/%252F%252Fevil.com')).toBe('/');
  });

  it('buildReturnTo supports URL and Location-like inputs', () => {
    const url = new URL('http://test.local/candidate/home?x=1');
    expect(buildReturnTo(url)).toBe('/candidate/home?x=1');

    const loc = { pathname: '/dashboard', search: '?mode=dev' } as Location;
    expect(buildReturnTo(loc)).toBe('/dashboard?mode=dev');
  });

  it('buildReturnTo falls back safely when no input and no window', () => {
    const originalWindow = global.window;
    delete (global as { window?: Window }).window;
    try {
      expect(buildReturnTo()).toBe('/');
    } finally {
      global.window = originalWindow;
    }
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

  it('handles null and undefined inputs', () => {
    expect(sanitizeReturnTo(null)).toBe('/');
    expect(sanitizeReturnTo(undefined)).toBe('/');
    expect(sanitizeReturnTo('')).toBe('/');
  });

  it('handles auth prefix with hash', () => {
    expect(sanitizeReturnTo('/auth#foo')).toBe('/');
    expect(sanitizeReturnTo('/api/auth#bar')).toBe('/');
  });

  it('handles relative paths not starting with slash', () => {
    expect(sanitizeReturnTo('relative/path')).toBe('/');
    expect(sanitizeReturnTo('dashboard')).toBe('/');
  });

  it('handles protocol-like patterns', () => {
    expect(sanitizeReturnTo('/path://something')).toBe('/');
  });

  it('handles /javascript: variant', () => {
    expect(sanitizeReturnTo('/javascript:void(0)')).toBe('/');
  });

  it('buildReturnTo handles NextRequest-like object', () => {
    const nextRequest = {
      nextUrl: {
        pathname: '/candidate/test',
        search: '?id=123',
      },
    };
    expect(buildReturnTo(nextRequest as never)).toBe('/candidate/test?id=123');
  });

  it('buildReturnTo uses window.location when no input provided', () => {
    const originalWindow = global.window;
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          pathname: '/dashboard',
          search: '?tab=overview',
        },
      },
      configurable: true,
    });
    try {
      expect(buildReturnTo()).toBe('/dashboard?tab=overview');
    } finally {
      global.window = originalWindow;
    }
  });

  it('buildReturnTo handles Location without search', () => {
    const loc = { pathname: '/simple' } as Location;
    expect(buildReturnTo(loc)).toBe('/simple');
  });
});
