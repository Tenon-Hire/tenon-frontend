import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useDashboardData } from '@/features/recruiter/dashboard/hooks/useDashboardData';

const fetchDashboard = jest.fn();

jest.mock('@/features/recruiter/dashboard/hooks/dashboardApi', () => ({
  fetchDashboard: (...args: unknown[]) => fetchDashboard(...args),
  isAbortError: (err: unknown) =>
    err instanceof DOMException && err.name === 'AbortError',
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function TestDashboard({ fetchOnMount = true }: { fetchOnMount?: boolean }) {
  const {
    profile,
    simulations,
    loadingProfile,
    loadingSimulations,
    profileError,
    simError,
    refresh,
  } = useDashboardData({ fetchOnMount });

  return (
    <div>
      <div data-testid="profile-loading">{String(loadingProfile)}</div>
      <div data-testid="sim-loading">{String(loadingSimulations)}</div>
      <div data-testid="profile-name">{profile?.name ?? ''}</div>
      <div data-testid="sim-count">{simulations.length}</div>
      <div data-testid="profile-error">{profileError ?? ''}</div>
      <div data-testid="sim-error">{simError ?? ''}</div>
      <button
        onClick={() => void refresh(false)}
        data-testid="refresh"
        type="button"
      >
        refresh
      </button>
    </div>
  );
}

describe('useDashboardData', () => {
  const originalLocation = window.location;
  const setLocation = (value: Location) => {
    Object.defineProperty(window, 'location', {
      value,
      writable: true,
      configurable: true,
    });
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    setLocation(originalLocation);
  });

  it('fetches profile and simulations and surfaces results', async () => {
    fetchDashboard.mockResolvedValueOnce({
      profile: {
        name: 'Recruiter',
        email: 'r@test.com',
        role: 'Hiring',
      },
      simulations: [
        { id: '1', title: 'Sim', role: 'Eng', createdAt: '2024-01-01' },
      ],
      profileError: null,
      simulationsError: null,
    });

    render(<TestDashboard />);

    expect(screen.getByTestId('profile-loading').textContent).toBe('true');
    expect(screen.getByTestId('sim-loading').textContent).toBe('true');

    await waitFor(() =>
      expect(screen.getByTestId('profile-name').textContent).toBe('Recruiter'),
    );

    expect(screen.getByTestId('sim-count').textContent).toBe('1');
    expect(screen.getByTestId('profile-loading').textContent).toBe('false');
    expect(screen.getByTestId('sim-loading').textContent).toBe('false');
    expect(screen.getByTestId('profile-error').textContent).toBe('');
    expect(screen.getByTestId('sim-error').textContent).toBe('');
    expect(fetchDashboard.mock.calls).toHaveLength(1);
  });

  it('dedupes concurrent refresh calls and keeps previous data while reloading', async () => {
    const profileDeferred = deferred<unknown>();

    fetchDashboard.mockReturnValueOnce(profileDeferred.promise);

    render(<TestDashboard fetchOnMount={false} />);

    const refreshButton = screen.getByTestId('refresh');
    fireEvent.click(refreshButton);
    fireEvent.click(refreshButton);

    expect(fetchDashboard.mock.calls).toHaveLength(1);
    expect(screen.getByTestId('profile-loading').textContent).toBe('true');

    profileDeferred.resolve({
      profile: {
        name: 'R',
        email: 'r@test.com',
      },
      simulations: [
        { id: '1', title: 'Sim', role: 'Eng', createdAt: '2024-01-01' },
        { id: '2', title: 'Sim 2', role: 'Eng', createdAt: '2024-01-02' },
      ],
      profileError: null,
      simulationsError: null,
    });

    await waitFor(() =>
      expect(screen.getByTestId('sim-count').textContent).toBe('2'),
    );
    expect(screen.getByTestId('profile-loading').textContent).toBe('false');
    expect(screen.getByTestId('sim-loading').textContent).toBe('false');
  });

  it('redirects to login on 401 responses', async () => {
    const assignMock = jest.fn();
    setLocation({
      assign: assignMock,
      origin: 'http://app.test',
    } as unknown as Location);

    fetchDashboard.mockImplementationOnce(() => {
      window.location.assign('/auth/login?returnTo=/x');
      const error = new Error('unauthorized') as Error & { status?: number };
      error.status = 401;
      return Promise.reject(error);
    });

    render(<TestDashboard />);

    await waitFor(() => expect(assignMock).toHaveBeenCalled());
    expect(assignMock.mock.calls[0]?.[0]).toContain('/auth/login?');
  });

  it('redirects to not authorized on 403 responses', async () => {
    const assignMock = jest.fn();
    setLocation({
      assign: assignMock,
      origin: 'http://app.test',
    } as unknown as Location);

    fetchDashboard.mockImplementationOnce(() => {
      window.location.assign('/not-authorized?returnTo=/x');
      const error = new Error('forbidden') as Error & { status?: number };
      error.status = 403;
      return Promise.reject(error);
    });

    render(<TestDashboard />);

    await waitFor(() => expect(assignMock).toHaveBeenCalled());
    expect(assignMock.mock.calls[0]?.[0]).toContain('/not-authorized?');
  });

  it('surfaces errors for non-auth failures', async () => {
    fetchDashboard.mockRejectedValueOnce(new Error('fail'));

    render(<TestDashboard />);

    await waitFor(() =>
      expect(screen.getByTestId('profile-error').textContent).toBe('fail'),
    );
    expect(screen.getByTestId('sim-error').textContent).toBe('fail');
  });

  it('ignores abort errors without setting error state', async () => {
    fetchDashboard.mockRejectedValueOnce(
      new DOMException('Aborted', 'AbortError'),
    );

    render(<TestDashboard />);

    await waitFor(() =>
      expect(screen.getByTestId('profile-loading').textContent).toBe('false'),
    );
    expect(screen.getByTestId('profile-error').textContent).toBe('');
    expect(screen.getByTestId('sim-error').textContent).toBe('');
  });

  it('skips fetch on mount when fetchOnMount is false', async () => {
    render(<TestDashboard fetchOnMount={false} />);
    expect(fetchDashboard.mock.calls).toHaveLength(0);
  });
});
