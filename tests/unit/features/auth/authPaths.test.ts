import {
  buildClearAuthHref,
  buildLoginHref,
  buildLogoutHref,
  buildSignupHref,
} from '@/features/auth/authPaths';

const originalCandidate =
  process.env.NEXT_PUBLIC_TENON_AUTH0_CANDIDATE_CONNECTION;
const originalRecruiter =
  process.env.NEXT_PUBLIC_TENON_AUTH0_RECRUITER_CONNECTION;

describe('authPaths buildLoginHref', () => {
  afterAll(() => {
    process.env.NEXT_PUBLIC_TENON_AUTH0_CANDIDATE_CONNECTION =
      originalCandidate;
    process.env.NEXT_PUBLIC_TENON_AUTH0_RECRUITER_CONNECTION =
      originalRecruiter;
  });

  it('appends candidate connection when mode=candidate', () => {
    process.env.NEXT_PUBLIC_TENON_AUTH0_CANDIDATE_CONNECTION =
      'Tenon-Candidates';
    const href = buildLoginHref('/candidate/dashboard', 'candidate');
    expect(href).toContain('mode=candidate');
    expect(href).toContain('connection=Tenon-Candidates');
    expect(href).toContain('returnTo=%2Fcandidate%2Fdashboard');
  });

  it('appends recruiter connection when mode=recruiter', () => {
    process.env.NEXT_PUBLIC_TENON_AUTH0_RECRUITER_CONNECTION = 'rec-db';
    const href = buildLoginHref('/dashboard', 'recruiter');
    expect(href).toContain('mode=recruiter');
    expect(href).toContain('connection=rec-db');
    expect(href).toContain('returnTo=%2Fdashboard');
  });

  it('builds signup link with screen_hint', () => {
    const href = buildSignupHref('/candidate/dashboard', 'candidate');
    expect(href).toContain('screen_hint=signup');
    expect(href).toContain('mode=candidate');
  });
});

describe('authPaths buildClearAuthHref', () => {
  it('builds a clear-auth link with returnTo and mode', () => {
    const href = buildClearAuthHref('/dashboard', 'recruiter');
    expect(href).toBe('/auth/clear?returnTo=%2Fdashboard&mode=recruiter');
  });

  it('defaults to returnTo when mode is missing', () => {
    const href = buildClearAuthHref('/candidate/dashboard');
    expect(href).toBe('/auth/clear?returnTo=%2Fcandidate%2Fdashboard');
  });
});

describe('authPaths buildLogoutHref', () => {
  it('uses an absolute returnTo for logout when a path is provided', () => {
    const href = buildLogoutHref('/dashboard');
    expect(href).toBe(
      '/auth/logout?returnTo=http%3A%2F%2Flocalhost%2Fdashboard',
    );
  });

  it('defaults logout returnTo to the origin root', () => {
    const href = buildLogoutHref();
    expect(href).toBe('/auth/logout?returnTo=http%3A%2F%2Flocalhost%2F');
  });
});
