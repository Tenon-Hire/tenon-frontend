import React from 'react';
import { render, screen } from '@testing-library/react';

const marketingMock = jest.fn(
  ({ user }: { user: { email?: string } | undefined }) => (
    <div data-testid="marketing-home">{user?.email ?? 'anon'}</div>
  ),
);
const candidateDashboardMock = jest.fn(
  ({ signedInEmail }: { signedInEmail: string | null }) => (
    <div data-testid="candidate-dashboard">{signedInEmail ?? 'none'}</div>
  ),
);
const recruiterDashboardMock = jest.fn(() => (
  <div data-testid="recruiter-dashboard" />
));
const simulationDetailMock = jest.fn(() => (
  <div data-testid="simulation-detail" />
));
const simulationCreateMock = jest.fn(() => (
  <div data-testid="simulation-create" />
));
const candidateSubmissionsMock = jest.fn(() => (
  <div data-testid="candidate-submissions" />
));

const getCachedSessionNormalizedMock = jest.fn();
const requireCandidateTokenMock = jest.fn();

jest.mock('@/features/marketing/home/MarketingHomePage', () => ({
  __esModule: true,
  default: (props: { user?: { email?: string } }) => marketingMock(props),
}));

jest.mock('@/features/candidate/dashboard/CandidateDashboardPage', () => ({
  __esModule: true,
  default: (props: { signedInEmail: string | null }) =>
    candidateDashboardMock(props),
}));

jest.mock('@/features/recruiter/dashboard/RecruiterDashboardPage', () => ({
  __esModule: true,
  default: () => recruiterDashboardMock(),
}));

jest.mock(
  '@/features/recruiter/simulation-detail/RecruiterSimulationDetailPage',
  () => ({
    __esModule: true,
    default: () => simulationDetailMock(),
  }),
);

jest.mock('@/features/recruiter/simulations/SimulationCreatePage', () => ({
  __esModule: true,
  default: () => simulationCreateMock(),
}));

jest.mock('@/features/recruiter/candidate-submissions/CandidateSubmissionsPage', () => ({
  __esModule: true,
  default: () => candidateSubmissionsMock(),
}));

jest.mock('@/lib/auth0', () => ({
  getCachedSessionNormalized: (...args: unknown[]) =>
    getCachedSessionNormalizedMock(...args),
}));

jest.mock('@/app/(candidate)/candidate-sessions/token-params', () => {
  const actual = jest.requireActual(
    '@/app/(candidate)/candidate-sessions/token-params',
  );
  return {
    ...actual,
    requireCandidateToken: (...args: unknown[]) =>
      requireCandidateTokenMock(...args),
  };
});

jest.mock('@/features/candidate/session/CandidateSessionPage', () => ({
  __esModule: true,
  default: ({ token }: { token: string }) => (
    <div data-testid="candidate-session-page">{token}</div>
  ),
}));

describe('route wrapper pages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders marketing page with user when session present', async () => {
    getCachedSessionNormalizedMock.mockResolvedValue({ user: { email: 'a@b' } });
    const { default: MarketingPage } = await import('@/app/(marketing)/page');
    const element = await MarketingPage();
    render(element);
    expect(marketingMock).toHaveBeenCalledWith({ user: { email: 'a@b' } });
    expect(screen.getByTestId('marketing-home')).toHaveTextContent('a@b');
  });

  it('renders candidate dashboard with signed-in email fallback', async () => {
    getCachedSessionNormalizedMock.mockResolvedValue({ user: { email: 'c@d' } });
    const { default: CandidateDashboardRoute } = await import(
      '@/app/(candidate)/candidate/dashboard/page'
    );
    const element = await CandidateDashboardRoute();
    render(element);
    expect(candidateDashboardMock).toHaveBeenCalledWith({
      signedInEmail: 'c@d',
    });
  });

  it('renders candidate dashboard with null email when missing', async () => {
    getCachedSessionNormalizedMock.mockResolvedValue({ user: {} });
    const { default: CandidateDashboardRoute } = await import(
      '@/app/(candidate)/candidate/dashboard/page'
    );
    const element = await CandidateDashboardRoute();
    render(element);
    expect(candidateDashboardMock).toHaveBeenCalledWith({
      signedInEmail: null,
    });
  });

  it('passes token into candidate session route', async () => {
    requireCandidateTokenMock.mockResolvedValue('tok_123');
    const { default: CandidateSessionRoute } = await import(
      '@/app/(candidate)/candidate/session/[token]/page'
    );
    const element = await CandidateSessionRoute({
      params: Promise.resolve({ token: 'tok_123' }),
    });
    render(element);
    expect(requireCandidateTokenMock).toHaveBeenCalled();
  });

  it('renders recruiter pages without extra props', async () => {
    const { default: DashboardPage } = await import(
      '@/app/(recruiter)/dashboard/page'
    );
    render(await DashboardPage());
    expect(recruiterDashboardMock).toHaveBeenCalled();

    const { default: SimulationDetailPage } = await import(
      '@/app/(recruiter)/dashboard/simulations/[id]/page'
    );
    render(await SimulationDetailPage());
    expect(simulationDetailMock).toHaveBeenCalled();

    const { default: SimulationCreatePage } = await import(
      '@/app/(recruiter)/dashboard/simulations/new/page'
    );
    render(await SimulationCreatePage());
    expect(simulationCreateMock).toHaveBeenCalled();

    const { default: CandidateSubmissionsPage } = await import(
      '@/app/(recruiter)/dashboard/simulations/[id]/candidates/[candidateSessionId]/page'
    );
    render(await CandidateSubmissionsPage());
    expect(candidateSubmissionsMock).toHaveBeenCalled();
  });

  it('exposes root layout metadata and viewport', async () => {
    const { metadata, viewport, default: RootLayout } = await import(
      '@/app/layout'
    );
    expect(metadata?.title).toBeDefined();
    expect(viewport?.width).toBe('device-width');
    const element = RootLayout({
      children: <div data-testid="child">ok</div>,
    });
    expect(React.isValidElement(element)).toBe(true);
    expect(element.type).toBe('html');
  });

  it('loads auth route metadata and components', async () => {
    const { metadata: loginMeta, default: LoginRoute } = await import(
      '@/app/(auth)/auth/login/page'
    );
    expect(loginMeta.title).toBeDefined();
    render(
      await LoginRoute({
        searchParams: Promise.resolve({ returnTo: '/foo', mode: 'candidate' }),
      }),
    );

    const { metadata: logoutMeta, default: LogoutRoute } = await import(
      '@/app/(auth)/auth/logout/page'
    );
    expect(logoutMeta.title).toBeDefined();
    render(await LogoutRoute());

    const { metadata: authErrorMeta } = await import(
      '@/app/(auth)/auth/error/page'
    );
    expect(authErrorMeta.title).toContain('Sign-in error');
  });
});
