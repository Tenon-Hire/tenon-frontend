import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/features/candidate/dashboard/CandidateDashboardPage', () => ({
  __esModule: true,
  default: (props: { signedInEmail: string | null }) => (
    <div
      data-testid="candidate-dashboard"
      data-signed-email={props.signedInEmail ?? ''}
    />
  ),
}));

jest.mock('@/features/recruiter/dashboard/DashboardView', () => ({
  __esModule: true,
  default: () => <div data-testid="recruiter-dashboard" />,
}));

jest.mock('@/features/recruiter/dashboard/RecruiterDashboardPage', () => ({
  __esModule: true,
  default: () => <div data-testid="recruiter-dashboard" />,
}));

jest.mock('@/features/recruiter/simulations/SimulationCreatePage', () => ({
  __esModule: true,
  default: () => <div data-testid="simulation-create" />,
}));

jest.mock('@/features/auth/LoginPage', () => ({
  __esModule: true,
  default: () => <div data-testid="login-page" />,
}));

jest.mock('@/features/auth/LogoutPage', () => ({
  __esModule: true,
  default: () => <div data-testid="logout-page" />,
}));

jest.mock('@/features/auth/AuthErrorPage', () => ({
  __esModule: true,
  default: () => <div data-testid="auth-error-page" />,
}));

jest.mock('@/features/candidate/session/CandidateSessionPage', () => ({
  __esModule: true,
  default: (props: { token: string }) => (
    <div data-testid="candidate-session-page" {...props} />
  ),
}));

jest.mock(
  '@/features/recruiter/candidate-submissions/CandidateSubmissionsPage',
  () => ({
    __esModule: true,
    default: () => <div data-testid="candidate-submissions-page" />,
  }),
);

jest.mock('@/lib/auth0', () => ({
  getCachedSessionNormalized: jest.fn(async () => ({
    user: { email: 'user@example.com' },
  })),
}));

jest.mock('@/app/(candidate)/candidate-sessions/token-params', () => ({
  requireCandidateToken: jest.fn(
    async (params: { token: string }) => params.token,
  ),
}));

describe('app route pages', () => {
  it('renders candidate dashboard page with normalized email', async () => {
    const mod = await import('@/app/(candidate)/candidate/dashboard/page');
    const el = await mod.default();
    render(el);
    expect(screen.getByTestId('candidate-dashboard')).toHaveAttribute(
      'data-signed-email',
      'user@example.com',
    );
  });

  it('renders candidate session page with token param', async () => {
    const { default: Page } =
      await import('@/app/(candidate)/candidate/session/[token]/page');
    const el = await Page({ params: { token: 'abc123' } });
    render(el);
    expect(screen.getByTestId('candidate-session-page')).toHaveAttribute(
      'token',
      'abc123',
    );
  });

  it('renders recruiter dashboard page', async () => {
    const { default: Page } = await import('@/app/(recruiter)/dashboard/page');
    const el = await Page();
    render(el);
    expect(screen.getByTestId('recruiter-dashboard')).toBeInTheDocument();
  });

  it('renders recruiter simulations create page', async () => {
    const { default: Page } =
      await import('@/app/(recruiter)/dashboard/simulations/new/page');
    const el = await Page();
    render(el);
    expect(screen.getByTestId('simulation-create')).toBeInTheDocument();
  });

  it('renders auth login and logout pages', async () => {
    const { default: LoginPage } = await import('@/app/(auth)/auth/login/page');
    const { default: LogoutPage } =
      await import('@/app/(auth)/auth/logout/page');
    render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId('login-page')).toBeInTheDocument();

    render(await LogoutPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByTestId('logout-page')).toBeInTheDocument();
  });

  it('renders auth error page', async () => {
    const { default: ErrorPage } = await import('@/app/(auth)/auth/error/page');
    const el = await ErrorPage({ searchParams: Promise.resolve({}) });
    render(el);
    expect(screen.getByTestId('auth-error-page')).toBeInTheDocument();
  });
});
