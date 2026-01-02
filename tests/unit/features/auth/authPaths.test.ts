import { buildLoginHref } from '@/features/auth/authPaths';

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
});
