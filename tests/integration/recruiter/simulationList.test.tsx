import '../setup/routerMock';
import { render, screen, waitFor } from '@testing-library/react';
import RecruiterDashboardPage from '@/features/recruiter/dashboard/RecruiterDashboardPage';
import { listSimulations } from '@/lib/api/recruiter';

jest.mock('@/lib/api/recruiter', () => ({
  ...jest.requireActual('@/lib/api/recruiter'),
  listSimulations: jest.fn(),
}));

const listSimulationsMock = listSimulations as jest.MockedFunction<
  typeof listSimulations
>;

describe('Recruiter simulations list (integration)', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders simulations returned from the backend', async () => {
    listSimulationsMock.mockResolvedValue([
      {
        id: 'sim_1',
        title: 'Backend Simulation',
        role: 'Backend Engineer',
        createdAt: '2025-12-10T10:00:00Z',
        candidateCount: 3,
      },
    ]);

    render(<RecruiterDashboardPage profile={null} error={null} />);

    await waitFor(() =>
      expect(screen.getByText('Backend Simulation')).toBeInTheDocument(),
    );
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('3 candidate(s)')).toBeInTheDocument();
  });

  it('shows empty state when no simulations exist', async () => {
    listSimulationsMock.mockResolvedValue([]);

    render(<RecruiterDashboardPage profile={null} error={null} />);

    expect(await screen.findByText(/No simulations yet/)).toBeInTheDocument();
    expect(screen.queryByText(/candidate\(s\)/i)).not.toBeInTheDocument();
  });

  it('shows error message when backend call fails', async () => {
    listSimulationsMock.mockRejectedValue({
      message: 'Unauthorized',
      status: 401,
    });

    render(<RecruiterDashboardPage profile={null} error={null} />);

    expect(
      await screen.findByText(/Couldn’t load simulations/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
  });
});
