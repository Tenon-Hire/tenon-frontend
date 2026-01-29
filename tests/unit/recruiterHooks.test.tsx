import { render, waitFor } from '@testing-library/react';
import { useRecruiterProfile } from '@/features/recruiter/dashboard/hooks/useRecruiterProfile';
import { useSimulations } from '@/features/recruiter/dashboard/hooks/useSimulations';
import { listSimulations } from '@/lib/api/recruiter';
import { recruiterBffClient } from '@/lib/api/httpClient';

jest.mock('@/lib/api/recruiter', () => ({
  listSimulations: jest.fn(),
}));

jest.mock('@/lib/api/httpClient', () => ({
  recruiterBffClient: { get: jest.fn() },
}));

function ProfileHarness({ fetchOnMount }: { fetchOnMount?: boolean }) {
  const { profile, error, loading } = useRecruiterProfile({ fetchOnMount });
  return (
    <div>
      <div data-testid="profile-loading">{String(loading)}</div>
      <div data-testid="profile-name">{profile?.name ?? ''}</div>
      <div data-testid="profile-error">{error ?? ''}</div>
    </div>
  );
}

function SimulationsHarness() {
  const { simulations, loading, error } = useSimulations();
  return (
    <div>
      <div data-testid="sims-loading">{String(loading)}</div>
      <div data-testid="sims-count">{simulations.length}</div>
      <div data-testid="sims-error">{error ?? ''}</div>
    </div>
  );
}

describe('recruiter hooks', () => {
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

  it('loads recruiter profile successfully', async () => {
    (recruiterBffClient.get as jest.Mock).mockResolvedValueOnce({
      name: 'Recruiter',
      email: 'r@test.com',
    });

    const { getByTestId } = render(<ProfileHarness />);

    await waitFor(() =>
      expect(getByTestId('profile-name').textContent).toBe('Recruiter'),
    );
    expect(getByTestId('profile-loading').textContent).toBe('false');
    expect(getByTestId('profile-error').textContent).toBe('');
  });

  it('sets error when profile fetch fails', async () => {
    (recruiterBffClient.get as jest.Mock).mockRejectedValueOnce(
      new Error('boom'),
    );

    const { getByTestId } = render(<ProfileHarness />);

    await waitFor(() =>
      expect(getByTestId('profile-error').textContent).toContain('boom'),
    );
    expect(getByTestId('profile-loading').textContent).toBe('false');
  });

  it('loads simulations and clears loading', async () => {
    (listSimulations as jest.Mock).mockResolvedValueOnce([
      { id: '1', title: 'Sim', role: 'Eng', createdAt: '2024-01-01' },
    ]);

    const { getByTestId } = render(<SimulationsHarness />);

    await waitFor(() =>
      expect(getByTestId('sims-count').textContent).toBe('1'),
    );
    expect(getByTestId('sims-loading').textContent).toBe('false');
    expect(getByTestId('sims-error').textContent).toBe('');
  });

  it('surfaces simulations error on failure', async () => {
    (listSimulations as jest.Mock).mockRejectedValueOnce(new Error('sim-fail'));

    const { getByTestId } = render(<SimulationsHarness />);

    await waitFor(() =>
      expect(getByTestId('sims-error').textContent).toContain('sim-fail'),
    );
    expect(getByTestId('sims-loading').textContent).toBe('false');
  });

  it('redirects to login when profile fetch is unauthorized', async () => {
    const assignMock = jest.fn();
    setLocation({
      assign: assignMock,
      origin: 'http://app.test',
    } as unknown as Location);

    (recruiterBffClient.get as jest.Mock).mockRejectedValueOnce({
      status: 401,
      details: { detail: 'unauthorized' },
    });

    render(<ProfileHarness />);

    await waitFor(() => expect(assignMock).toHaveBeenCalled());
    expect(assignMock.mock.calls[0]?.[0]).toContain('/auth/login?');
  });

  it('redirects to not authorized when profile fetch is forbidden', async () => {
    const assignMock = jest.fn();
    setLocation({
      assign: assignMock,
      origin: 'http://app.test',
    } as unknown as Location);

    (recruiterBffClient.get as jest.Mock).mockRejectedValueOnce({
      status: 403,
      details: { detail: 'forbidden' },
    });

    render(<ProfileHarness />);

    await waitFor(() => expect(assignMock).toHaveBeenCalled());
    expect(assignMock.mock.calls[0]?.[0]).toContain('/not-authorized?');
  });

  it('skips fetch on mount when disabled', async () => {
    (recruiterBffClient.get as jest.Mock).mockResolvedValueOnce(null);
    const { getByTestId } = render(<ProfileHarness fetchOnMount={false} />);
    expect(getByTestId('profile-loading').textContent).toBe('false');
    expect((recruiterBffClient.get as jest.Mock).mock.calls).toHaveLength(0);
  });

  it('handles non-array simulation responses', async () => {
    (listSimulations as jest.Mock).mockResolvedValueOnce(null);

    const { getByTestId } = render(<SimulationsHarness />);

    await waitFor(() =>
      expect(getByTestId('sims-count').textContent).toBe('0'),
    );
    expect(getByTestId('sims-error').textContent).toBe('');
  });

  it('ignores abort errors when loading simulations', async () => {
    (listSimulations as jest.Mock).mockRejectedValueOnce(
      new DOMException('Aborted', 'AbortError'),
    );

    const { getByTestId } = render(<SimulationsHarness />);

    await waitFor(() =>
      expect(getByTestId('sims-loading').textContent).toBe('false'),
    );
    expect(getByTestId('sims-error').textContent).toBe('');
  });
});
