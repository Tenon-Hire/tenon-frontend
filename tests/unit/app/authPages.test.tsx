import React from 'react';
import { render, screen } from '@testing-library/react';

const loginMock = jest.fn(
  ({ returnTo, mode }: { returnTo?: string; mode?: string }) => (
    <div data-testid="login-mock">
      {returnTo ?? 'none'}|{mode ?? 'none'}
    </div>
  ),
);
const logoutMock = jest.fn(() => <div data-testid="logout-mock" />);
const authErrorMock = jest.fn((props: Record<string, unknown>) => (
  <div data-testid="auth-error-mock">{JSON.stringify(props)}</div>
));

jest.mock('@/features/auth/LoginPage', () => ({
  __esModule: true,
  default: (props: { returnTo?: string; mode?: string }) => loginMock(props),
}));
jest.mock('@/features/auth/LogoutPage', () => ({
  __esModule: true,
  default: () => logoutMock(),
}));
jest.mock('@/features/auth/AuthErrorPage', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => authErrorMock(props),
}));

const sanitizeReturnToMock = jest.fn(
  (value?: string | null) => value?.trim() || '/',
);
const modeForPathMock = jest.fn(() => 'candidate');
jest.mock('@/lib/auth/routing', () => ({
  sanitizeReturnTo: (...args: unknown[]) => sanitizeReturnToMock(...args),
  modeForPath: (...args: unknown[]) => modeForPathMock(...args),
}));

describe('auth route entrypoints', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('login page resolves search params and defaults when missing', async () => {
    const { default: LoginRoutePage } =
      await import('@/app/(auth)/auth/login/page');
    const element = await LoginRoutePage({ searchParams: undefined });
    render(element);
    expect(loginMock).toHaveBeenCalledWith({
      returnTo: undefined,
      mode: undefined,
    });

    const elementWithParams = await LoginRoutePage({
      searchParams: Promise.resolve({ returnTo: ' /dest ', mode: 'unknown' }),
    });
    render(elementWithParams);
    expect(sanitizeReturnToMock).toHaveBeenCalledWith(' /dest ');
    expect(loginMock).toHaveBeenCalledWith({
      returnTo: '/dest',
      mode: undefined,
    });
  });

  it('logout page renders', async () => {
    const { default: LogoutRoutePage } =
      await import('@/app/(auth)/auth/logout/page');
    const element = await LogoutRoutePage();
    render(element);
    expect(logoutMock).toHaveBeenCalled();
  });

  it('auth error page derives mode and cleared flag', async () => {
    const { default: AuthErrorRoutePage } =
      await import('@/app/(auth)/auth/error/page');
    const element = await AuthErrorRoutePage({
      searchParams: Promise.resolve({
        returnTo: '/candidate/dashboard',
        error: 'boom',
        errorCode: 'bad',
        errorId: 'id1',
        cleared: 'true',
      }),
    });
    render(element);
    expect(modeForPathMock).toHaveBeenCalled();
    expect(authErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        returnTo: '/candidate/dashboard',
        mode: 'candidate',
        error: 'boom',
        errorCode: 'bad',
        errorId: 'id1',
        cleared: true,
      }),
    );
  });

  it('not-authorized page renders links per mode and returnTo', async () => {
    const { default: NotAuthorizedPage } =
      await import('@/app/not-authorized/page');
    const element = await NotAuthorizedPage({
      searchParams: Promise.resolve({ mode: 'recruiter', returnTo: '/dash' }),
    });
    render(element);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/candidate/dashboard');
    expect(links[1]).toHaveAttribute('href', '/dash');
  });

  it('global error shows digest in prod and hides in dev', async () => {
    const { default: GlobalError } = await import('@/app/global-error');
    const reset = jest.fn();
    const prodView = GlobalError({
      error: Object.assign(new Error('fail'), { digest: '123' }),
      reset,
    });
    render(prodView, { container: document.documentElement });
    expect(screen.getByText(/Error id: 123/)).toBeInTheDocument();

    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const devView = GlobalError({
      error: Object.assign(new Error('boom'), { digest: undefined }),
      reset,
    });
    render(devView, { container: document.documentElement });
    expect(screen.getByText(/boom/)).toBeInTheDocument();
    process.env.NODE_ENV = prevEnv;
  });
});
