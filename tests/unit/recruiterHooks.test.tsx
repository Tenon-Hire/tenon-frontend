import { render, waitFor } from '@testing-library/react';
import { useRecruiterProfile } from '@/features/recruiter/dashboard/hooks/useRecruiterProfile';
import { useSimulations } from '@/features/recruiter/dashboard/hooks/useSimulations';
import { listSimulations } from '@/lib/api/recruiter';

jest.mock('@/lib/api/recruiter', () => ({
  listSimulations: jest.fn(),
}));

function ProfileHarness() {
  const { profile, error, loading } = useRecruiterProfile();
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
  const realFetch = global.fetch;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('loads recruiter profile successfully', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ name: 'Recruiter', email: 'r@test.com' }),
    }) as unknown as typeof fetch;

    const { getByTestId } = render(<ProfileHarness />);

    await waitFor(() =>
      expect(getByTestId('profile-name').textContent).toBe('Recruiter'),
    );
    expect(getByTestId('profile-loading').textContent).toBe('false');
    expect(getByTestId('profile-error').textContent).toBe('');
  });

  it('sets error when profile fetch fails', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom')) as unknown as typeof fetch;

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
});
