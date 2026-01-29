import React from 'react';
import { render, screen } from '@testing-library/react';

const mockGetCachedSessionNormalized = jest.fn();
const mockRequireCandidateToken = jest.fn();

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} data-testid="link">
      {children}
    </a>
  ),
}));

jest.mock('@/features/shared/notifications', () => ({
  NotificationsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="notifications">{children}</div>
  ),
}));

jest.mock('@/features/shared/layout/AppShell', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

jest.mock('@/features/marketing/home/MarketingHomePage', () => ({
  __esModule: true,
  default: ({ user }: { user?: { email?: string } | null }) => (
    <div data-testid="marketing-home">{user?.email ?? 'anon'}</div>
  ),
}));

jest.mock('@/features/candidate/dashboard/CandidateDashboardPage', () => ({
  __esModule: true,
  default: ({ signedInEmail }: { signedInEmail: string | null }) => (
    <div data-testid="candidate-dashboard">{signedInEmail ?? 'none'}</div>
  ),
}));

jest.mock('@/features/recruiter/dashboard/DashboardView', () => ({
  __esModule: true,
  default: () => <div data-testid="recruiter-dashboard" />,
}));

jest.mock('@/features/recruiter/simulations/SimulationCreatePage', () => ({
  __esModule: true,
  default: () => <div data-testid="recruiter-create-sim" />,
}));

jest.mock(
  '@/features/recruiter/simulation-detail/RecruiterSimulationDetailPage',
  () => ({
    __esModule: true,
    default: () => <div data-testid="recruiter-sim-detail" />,
  }),
);

jest.mock('@/features/recruiter/candidate-submissions/CandidateSubmissionsPage', () => ({
  __esModule: true,
  default: () => <div data-testid="candidate-submissions" />,
}));

jest.mock('@/features/auth/LoginPage', () => ({
  __esModule: true,
  default: ({ returnTo, mode }: { returnTo?: string; mode?: string }) => (
    <div data-testid="login-page">
      {returnTo ?? 'no-return'}|{mode ?? 'no-mode'}
    </div>
  ),
}));

jest.mock('@/features/auth/LogoutPage', () => ({
  __esModule: true,
  default: () => <div data-testid="logout-page" />,
}));

jest.mock('@/features/auth/AuthErrorPage', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <div data-testid="auth-error-page">
      {JSON.stringify(props)}
    </div>
  ),
}));

jest.mock('@/features/candidate/session/CandidateSessionPage', () => ({
  __esModule: true,
  default: ({ token }: { token: string }) => (
    <div data-testid="candidate-session-page">{token}</div>
  ),
}));

jest.mock('@/lib/auth0', () => ({
  getCachedSessionNormalized: (...args: unknown[]) =>
    mockGetCachedSessionNormalized(...args),
}));

jest.mock(
  '@/app/(candidate)/candidate-sessions/token-params',
  () => ({
    requireCandidateToken: (...args: unknown[]) =>
      mockRequireCandidateToken(...args),
  }),
);

jest.mock('@/lib/auth/routing', () => {
  const actual = jest.requireActual('@/lib/auth/routing');
  return {
    ...actual,
    sanitizeReturnTo: jest.fn((value?: string | null) =>
      typeof value === 'string' ? value.trim() || '/' : '/',
    ),
    modeForPath: jest.fn(() => 'candidate'),
  };
});

describe('app layouts and pages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCachedSessionNormalized.mockResolvedValue({
      user: { email: 'user@example.com' },
    });
    mockRequireCandidateToken.mockResolvedValue('token-123');
  });

  it('renders root layout with notifications provider', async () => {
    const { default: RootLayout } = await import('@/app/layout');
    render(
      RootLayout({
        children: <div data-testid="child">child</div>,
      }),
    );
    expect(screen.getByTestId('notifications')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders marketing home page with cached session', async () => {
    const { default: MarketingPage } = await import('@/app/(marketing)/page');
    const element = await MarketingPage();
    render(element);
    expect(mockGetCachedSessionNormalized).toHaveBeenCalled();
    expect(screen.getByTestId('marketing-home').textContent).toBe(
      'user@example.com',
    );
  });

  it('renders marketing layout with children', async () => {
    const { default: MarketingLayout } = await import(
      '@/app/(marketing)/layout'
    );
    render(
      MarketingLayout({
        children: <div data-testid="child">ok</div>,
      }),
    );
    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders candidate dashboard route and passes email', async () => {
    const { default: CandidateDashboardRoute } = await import(
      '@/app/(candidate)/candidate/dashboard/page'
    );
    const element = await CandidateDashboardRoute();
    render(element);
    expect(screen.getByTestId('candidate-dashboard').textContent).toBe(
      'user@example.com',
    );
  });

  it('renders candidate layouts', async () => {
    const { default: CandidateLayout } = await import(
      '@/app/(candidate)/layout'
    );
    render(
      CandidateLayout({
        children: <div data-testid="candidate-child" />,
      }),
    );
    expect(screen.getByTestId('candidate-child')).toBeInTheDocument();

    const { default: CandidateInner } = await import(
      '@/app/(candidate)/candidate/layout'
    );
    render(
      CandidateInner({
        children: <div data-testid="candidate-inner" />,
      }),
    );
    expect(screen.getByTestId('candidate-inner')).toBeInTheDocument();
  });

  it('resolves candidate session token route', async () => {
    const { default: CandidateSessionRoute } = await import(
      '@/app/(candidate)/candidate/session/[token]/page'
    );
    const element = await CandidateSessionRoute({
      params: { token: 'abc' } as never,
    });
    render(element);
    expect(mockRequireCandidateToken).toHaveBeenCalledWith({ token: 'abc' });
    expect(screen.getByTestId('candidate-session-page').textContent).toBe(
      'token-123',
    );
  });

  it('renders recruiter dashboard and nested pages', async () => {
    const { default: RecruiterDashboardPage } = await import(
      '@/app/(recruiter)/dashboard/page'
    );
    render(await RecruiterDashboardPage());
    expect(screen.getByTestId('recruiter-dashboard')).toBeInTheDocument();

    const { default: SimDetailPage } = await import(
      '@/app/(recruiter)/dashboard/simulations/[id]/page'
    );
    render(SimDetailPage());
    expect(screen.getByTestId('recruiter-sim-detail')).toBeInTheDocument();

    const { default: CandidatesPage } = await import(
      '@/app/(recruiter)/dashboard/simulations/[id]/candidates/[candidateSessionId]/page'
    );
    render(CandidatesPage());
    expect(screen.getByTestId('candidate-submissions')).toBeInTheDocument();

    const { default: NewSimPage } = await import(
      '@/app/(recruiter)/dashboard/simulations/new/page'
    );
    render(NewSimPage());
    expect(screen.getByTestId('recruiter-create-sim')).toBeInTheDocument();
  });

  it('renders recruiter layout', async () => {
    const { default: RecruiterLayout } = await import(
      '@/app/(recruiter)/layout'
    );
    render(
      RecruiterLayout({
        children: <div data-testid="recruiter-child" />,
      }),
    );
    expect(screen.getByTestId('recruiter-child')).toBeInTheDocument();
  });

  it('renders auth layouts and pages with sanitized params', async () => {
    const { default: AuthLayout } = await import('@/app/(auth)/layout');
    render(AuthLayout({ children: <div data-testid="auth-child" /> }));
    expect(screen.getByTestId('auth-child')).toBeInTheDocument();

    const { default: LoginRoute } = await import(
      '@/app/(auth)/auth/login/page'
    );
    const loginEl = await LoginRoute({
      searchParams: Promise.resolve({ returnTo: ' /return ', mode: 'candidate' }),
    });
    render(loginEl);
    expect(screen.getByTestId('login-page').textContent).toContain('/return');
    expect(screen.getByTestId('login-page').textContent).toContain('candidate');

    const { default: LogoutRoute } = await import(
      '@/app/(auth)/auth/logout/page'
    );
    render(await LogoutRoute());
    expect(screen.getByTestId('logout-page')).toBeInTheDocument();

    const { default: AuthErrorRoute } = await import(
      '@/app/(auth)/auth/error/page'
    );
    const errorEl = await AuthErrorRoute({
      searchParams: Promise.resolve({
        returnTo: '/home',
        error: 'oops',
        errorCode: 'bad',
        errorId: 'err1',
        cleared: '1',
      }),
    });
    render(errorEl);
    expect(
      screen
        .getByTestId('auth-error-page')
        .textContent?.includes('\"cleared\":true'),
    ).toBe(true);
  });

  it('renders marketing and candidate session layouts in one pass', async () => {
    const { default: CandidateSessionsLayout } = await import(
      '@/app/(candidate)/candidate-sessions/layout'
    );
    render(
      CandidateSessionsLayout({
        children: <div data-testid="sessions-child" />,
      }),
    );
    expect(screen.getByTestId('sessions-child')).toBeInTheDocument();
  });

  it('renders not-authorized page with mode-aware messaging', async () => {
    const { default: NotAuthorizedPage } = await import(
      '@/app/not-authorized/page'
    );
    const element = await NotAuthorizedPage({
      searchParams: Promise.resolve({
        mode: 'recruiter',
        returnTo: '/dest',
      }),
    });
    render(element);
    expect(screen.getAllByTestId('link')[1]).toHaveAttribute('href', '/dest');
  });

  it('renders global error with digest and retry', async () => {
    const { default: GlobalError } = await import('@/app/global-error');
    const reset = jest.fn();
    render(
      GlobalError({
        error: Object.assign(new Error('boom'), { digest: '123' }),
        reset,
      }),
    );
    screen.getByRole('button', { name: /Retry/i }).click();
    expect(reset).toHaveBeenCalled();
  });
});
