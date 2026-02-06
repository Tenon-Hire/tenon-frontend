import React from 'react';
import { render, screen } from '@testing-library/react';

const mockGetCachedSessionNormalized = jest.fn();
const mockRequireCandidateToken = jest.fn();

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} data-testid="link">
      {children}
    </a>
  ),
}));

jest.mock('@/shared/notifications', () => ({
  NotificationsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="notifications">{children}</div>
  ),
}));

jest.mock('@/shared/layout/AppShell', () => ({
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

jest.mock('@/features/recruiter/dashboard/RecruiterDashboardView', () => ({
  __esModule: true,
  default: () => <div data-testid="recruiter-dashboard" />,
}));

jest.mock(
  '@/features/recruiter/simulations/create/SimulationCreatePage',
  () => ({
    __esModule: true,
    default: () => <div data-testid="recruiter-create-sim" />,
  }),
);

jest.mock(
  '@/features/recruiter/simulations/detail/RecruiterSimulationDetailPage',
  () => ({
    __esModule: true,
    default: () => <div data-testid="recruiter-sim-detail" />,
  }),
);

jest.mock(
  '@/features/recruiter/simulations/candidates/CandidateSubmissionsPage',
  () => ({
    __esModule: true,
    default: () => <div data-testid="candidate-submissions" />,
  }),
);

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
    <div data-testid="auth-error-page">{JSON.stringify(props)}</div>
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

jest.mock('@/app/(candidate)/(legacy)/candidate-sessions/token-params', () => ({
  requireCandidateToken: (...args: unknown[]) =>
    mockRequireCandidateToken(...args),
}));

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
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCachedSessionNormalized.mockResolvedValue({
      user: { email: 'user@example.com' },
    });
    mockRequireCandidateToken.mockResolvedValue('token-123');
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders root layout with notifications provider', async () => {
    const { default: RootLayout } = await import('@/app/layout');
    const tree = RootLayout({
      children: <div data-testid="child">child</div>,
    });
    expect(tree).toBeTruthy();
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
    const { default: MarketingLayout } =
      await import('@/app/(marketing)/layout');
    const view = MarketingLayout({
      children: <div data-testid="child">ok</div>,
    });
    expect(view).toBeTruthy();
  });

  it('renders candidate dashboard route and passes email', async () => {
    const { default: CandidateDashboardRoute } =
      await import('@/app/(candidate)/candidate/dashboard/page');
    const element = await CandidateDashboardRoute();
    render(element);
    expect(screen.getByTestId('candidate-dashboard').textContent).toBe(
      'user@example.com',
    );
  });

  it('renders candidate layouts', async () => {
    const { default: CandidateLayout } =
      await import('@/app/(candidate)/layout');
    expect(
      CandidateLayout({
        children: <div data-testid="candidate-child" />,
      }),
    ).toBeTruthy();

    const { default: CandidateInner } =
      await import('@/app/(candidate)/candidate/layout');
    expect(
      CandidateInner({
        children: <div data-testid="candidate-inner" />,
      }),
    ).toBeTruthy();
  });

  it('resolves candidate session token route', async () => {
    const { default: CandidateSessionRoute } =
      await import('@/app/(candidate)/candidate/session/[token]/page');
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
    const { default: RecruiterDashboardPage } =
      await import('@/app/(recruiter)/dashboard/page');
    expect(await RecruiterDashboardPage()).toBeTruthy();

    const { default: SimDetailPage } =
      await import('@/app/(recruiter)/dashboard/simulations/[id]/page');
    expect(SimDetailPage()).toBeTruthy();

    const { default: CandidatesPage } =
      await import('@/app/(recruiter)/dashboard/simulations/[id]/candidates/[candidateSessionId]/page');
    expect(CandidatesPage()).toBeTruthy();

    const { default: NewSimPage } =
      await import('@/app/(recruiter)/dashboard/simulations/new/page');
    expect(NewSimPage()).toBeTruthy();
  });

  it('renders recruiter layout', async () => {
    const { default: RecruiterLayout } =
      await import('@/app/(recruiter)/layout');
    expect(
      RecruiterLayout({
        children: <div data-testid="recruiter-child" />,
      }),
    ).toBeTruthy();
  });

  it('renders auth layouts and pages with sanitized params', async () => {
    const { default: AuthLayout } = await import('@/app/(auth)/layout');
    expect(
      AuthLayout({ children: <div data-testid="auth-child" /> }),
    ).toBeTruthy();

    const { default: LoginRoute } =
      await import('@/app/(auth)/auth/login/page');
    const loginEl = await LoginRoute({
      searchParams: Promise.resolve({
        returnTo: ' /return ',
        mode: 'candidate',
      }),
    });
    render(loginEl);
    expect(screen.getByTestId('login-page').textContent).toContain('/return');
    expect(screen.getByTestId('login-page').textContent).toContain('candidate');

    const { default: LogoutRoute } =
      await import('@/app/(auth)/auth/logout/page');
    render(await LogoutRoute());
    expect(screen.getByTestId('logout-page')).toBeInTheDocument();

    const { default: AuthErrorRoute } =
      await import('@/app/(auth)/auth/error/page');
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
    const { default: CandidateSessionsLayout } =
      await import('@/app/(candidate)/(legacy)/candidate-sessions/layout');
    render(
      CandidateSessionsLayout({
        children: <div data-testid="sessions-child" />,
      }),
    );
    expect(screen.getByTestId('sessions-child')).toBeInTheDocument();
  });

  it('renders not-authorized page with mode-aware messaging', async () => {
    const { default: NotAuthorizedPage } =
      await import('@/app/(auth)/not-authorized/page');
    const element = await NotAuthorizedPage({
      searchParams: Promise.resolve({
        mode: 'recruiter',
        returnTo: '/dest',
      }),
    });
    render(element);
    expect(screen.getAllByTestId('link')[1]).toHaveAttribute('href', '/dest');
  });

  it('wraps not-authorized layout in AppShell', async () => {
    const { default: NotAuthorizedLayout } =
      await import('@/app/(auth)/not-authorized/layout');
    render(
      NotAuthorizedLayout({
        children: <div data-testid="na-child" />,
      }),
    );
    expect(screen.getByTestId('app-shell')).toBeInTheDocument();
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

  it('renders global error without digest in production', async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const { default: GlobalError } = await import('@/app/global-error');
    const view = GlobalError({
      error: Object.assign(new Error('fail'), {}),
      reset: jest.fn(),
    });
    render(view);
    expect(screen.queryByText(/Error id/)).not.toBeInTheDocument();
    process.env.NODE_ENV = prevEnv;
  });
});
