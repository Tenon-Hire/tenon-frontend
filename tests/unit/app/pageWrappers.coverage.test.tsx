/**
 * Additional page wrapper tests for coverage
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

const marketingMock = jest.fn((props: { user?: { email?: string } }) => (
  <div data-testid="marketing-home">{props.user?.email ?? 'anon'}</div>
));
const candidateDashboardMock = jest.fn(
  (props: { signedInEmail: string | null }) => (
    <div data-testid="candidate-dashboard">{props.signedInEmail ?? 'none'}</div>
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
const candidateSessionPageMock = jest.fn(({ token }: { token: string }) => (
  <div data-testid="candidate-session">{token}</div>
));
const authErrorPageMock = jest.fn(
  (props: { searchParams: { error?: string; error_description?: string } }) => (
    <div data-testid="auth-error">{props.searchParams.error ?? 'no-error'}</div>
  ),
);

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

jest.mock(
  '@/features/recruiter/candidate-submissions/CandidateSubmissionsPage',
  () => ({
    __esModule: true,
    default: () => candidateSubmissionsMock(),
  }),
);

jest.mock('@/features/candidate/session/CandidateSessionPage', () => ({
  __esModule: true,
  default: (props: { token: string }) => candidateSessionPageMock(props),
}));

jest.mock('@/features/auth/AuthErrorPage', () => ({
  __esModule: true,
  default: (props: {
    searchParams: { error?: string; error_description?: string };
  }) => authErrorPageMock(props),
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

describe('page wrapper coverage tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('marketing page', () => {
    it('passes user as undefined when no session', async () => {
      getCachedSessionNormalizedMock.mockResolvedValue(null);

      const { default: MarketingPage, metadata } =
        await import('@/app/(marketing)/page');
      const element = await MarketingPage();
      render(element);

      expect(marketingMock).toHaveBeenCalledWith({ user: undefined });
      expect(metadata).toBeDefined();
    });
  });

  describe('candidate dashboard', () => {
    it('passes null email when session has no user', async () => {
      getCachedSessionNormalizedMock.mockResolvedValue(null);

      const { default: CandidateDashboardRoute, metadata } =
        await import('@/app/(candidate)/candidate/dashboard/page');
      const element = await CandidateDashboardRoute();
      render(element);

      expect(candidateDashboardMock).toHaveBeenCalledWith({
        signedInEmail: null,
      });
      expect(metadata).toBeDefined();
    });
  });

  describe('candidate session page', () => {
    it('passes token to session page', async () => {
      requireCandidateTokenMock.mockResolvedValue('test-token-123');

      const { default: CandidateSessionRoute, metadata } =
        await import('@/app/(candidate)/candidate/session/[token]/page');
      const element = await CandidateSessionRoute({
        params: Promise.resolve({ token: 'test-token-123' }),
      });
      render(element);

      expect(requireCandidateTokenMock).toHaveBeenCalled();
      expect(screen.getByTestId('candidate-session')).toHaveTextContent(
        'test-token-123',
      );
      expect(metadata).toBeDefined();
    });
  });

  describe('recruiter pages', () => {
    it('renders recruiter dashboard with metadata', async () => {
      const { default: DashboardPage, metadata } =
        await import('@/app/(recruiter)/dashboard/page');
      render(await DashboardPage());

      expect(recruiterDashboardMock).toHaveBeenCalled();
      expect(metadata?.title).toBeDefined();
    });

    it('renders simulation detail with metadata', async () => {
      const { default: SimulationDetailPage, metadata } =
        await import('@/app/(recruiter)/dashboard/simulations/[id]/page');
      render(await SimulationDetailPage());

      expect(simulationDetailMock).toHaveBeenCalled();
      expect(metadata?.title).toBeDefined();
    });

    it('renders simulation create with metadata', async () => {
      const { default: SimulationCreatePage, metadata } =
        await import('@/app/(recruiter)/dashboard/simulations/new/page');
      render(await SimulationCreatePage());

      expect(simulationCreateMock).toHaveBeenCalled();
      expect(metadata?.title).toBeDefined();
    });

    it('renders candidate submissions with metadata', async () => {
      const { default: CandidateSubmissionsPage, metadata } =
        await import('@/app/(recruiter)/dashboard/simulations/[id]/candidates/[candidateSessionId]/page');
      render(await CandidateSubmissionsPage());

      expect(candidateSubmissionsMock).toHaveBeenCalled();
      expect(metadata?.title).toBeDefined();
    });
  });

  describe('auth error page', () => {
    it('has metadata defined', async () => {
      const { metadata } = await import('@/app/(auth)/auth/error/page');
      expect(metadata?.title).toBeDefined();
    });
  });

  describe('not-authorized page', () => {
    it('renders not authorized page with metadata', async () => {
      const { metadata } = await import('@/app/not-authorized/page');
      expect(metadata).toBeDefined();
    });

    it('renders not authorized layout', async () => {
      const { default: NotAuthorizedLayout } =
        await import('@/app/not-authorized/layout');
      const layout = NotAuthorizedLayout({
        children: <div>test</div>,
      });
      expect(React.isValidElement(layout)).toBe(true);
    });
  });

  describe('layouts', () => {
    it('imports auth layout', async () => {
      const { default: AuthLayout } = await import('@/app/(auth)/layout');
      const layout = AuthLayout({ children: <div>test</div> });
      expect(React.isValidElement(layout)).toBe(true);
    });

    it('imports candidate layout', async () => {
      const { default: CandidateLayout } =
        await import('@/app/(candidate)/layout');
      const layout = CandidateLayout({ children: <div>test</div> });
      expect(React.isValidElement(layout)).toBe(true);
    });

    it('imports recruiter layout', async () => {
      const { default: RecruiterLayout } =
        await import('@/app/(recruiter)/layout');
      const layout = RecruiterLayout({ children: <div>test</div> });
      expect(React.isValidElement(layout)).toBe(true);
    });

    it('imports marketing layout', async () => {
      const { default: MarketingLayout } =
        await import('@/app/(marketing)/layout');
      const layout = MarketingLayout({ children: <div>test</div> });
      expect(React.isValidElement(layout)).toBe(true);
    });
  });
});
