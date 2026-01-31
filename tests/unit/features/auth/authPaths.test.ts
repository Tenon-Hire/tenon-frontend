import {
  buildLoginHref,
  buildSignupHref,
  buildLogoutHref,
  buildClearAuthHref,
  modeForPath,
} from '@/features/auth/authPaths';

const originalEnv = { ...process.env };

describe('authPaths helpers', () => {
  beforeEach(() => {
    Object.assign(process.env, originalEnv, {
      NEXT_PUBLIC_TENON_AUTH0_CANDIDATE_CONNECTION: 'cand-conn',
      NEXT_PUBLIC_TENON_AUTH0_RECRUITER_CONNECTION: 'recruit-conn',
      NEXT_PUBLIC_TENON_APP_BASE_URL: 'https://app.tenon.dev',
      NEXT_PUBLIC_VERCEL_URL: '',
    });
  });

  afterAll(() => {
    Object.assign(process.env, originalEnv);
  });

  it('builds login href with mode and connection', () => {
    const href = buildLoginHref('/dest', 'candidate');
    expect(href).toContain('mode=candidate');
    expect(href).toContain('returnTo=%2Fdest');
    expect(href).toContain('connection=cand-conn');
  });

  it('defaults login mode to recruiter and omits connection when unset', () => {
    delete process.env.NEXT_PUBLIC_TENON_AUTH0_RECRUITER_CONNECTION;
    const href = buildLoginHref();
    expect(href).toBe('/auth/login?returnTo=%2F&mode=recruiter');
  });

  it('builds signup href with screen hint', () => {
    const href = buildSignupHref('/home', 'recruiter');
    expect(href).toContain('screen_hint=signup');
    expect(href).toContain('connection=recruit-conn');
  });

  it('builds logout href with absolute returnTo and strips hash/query', () => {
    const href = buildLogoutHref('/candidate/dashboard#hash?x=1');
    expect(href).toBe(
      '/auth/logout?returnTo=http%3A%2F%2Flocalhost%2Fcandidate%2Fdashboard',
    );
  });

  it('falls back to base logout when origin cannot be resolved', () => {
    delete process.env.NEXT_PUBLIC_TENON_APP_BASE_URL;
    const globalWithWindow = globalThis as { window?: unknown };
    delete globalWithWindow.window;
    const href = buildLogoutHref('/any');
    expect(href).toBe('/auth/logout');
  });

  it('uses vercel url fallback when app base missing', () => {
    delete process.env.NEXT_PUBLIC_TENON_APP_BASE_URL;
    process.env.NEXT_PUBLIC_VERCEL_URL = 'example.vercel.app';
    const href = buildLogoutHref('/candidate/dashboard');
    expect(href).toBe(
      '/auth/logout?returnTo=https%3A%2F%2Fexample.vercel.app%2Fcandidate%2Fdashboard',
    );
  });

  it('omits connection when candidate connection not set', () => {
    delete process.env.NEXT_PUBLIC_TENON_AUTH0_CANDIDATE_CONNECTION;
    const href = buildLoginHref('/dest', 'candidate');
    expect(href).toBe('/auth/login?returnTo=%2Fdest&mode=candidate');
  });

  it('returns base login when no returnTo provided and recruiter mode default', () => {
    delete process.env.NEXT_PUBLIC_TENON_AUTH0_RECRUITER_CONNECTION;
    const href = buildLoginHref(undefined, undefined);
    expect(href).toBe('/auth/login?returnTo=%2F&mode=recruiter');
  });

  it('builds clear auth href with optional mode', () => {
    expect(buildClearAuthHref('/back')).toBe('/auth/clear?returnTo=%2Fback');
    expect(buildClearAuthHref('/back', 'candidate')).toBe(
      '/auth/clear?returnTo=%2Fback&mode=candidate',
    );
  });

  it('derives mode from path segments', () => {
    expect(modeForPath('/candidate/session/abc')).toBe('candidate');
    expect(modeForPath('/dashboard')).toBe('recruiter');
    expect(modeForPath('/unknown')).toBe('recruiter');
  });
});
