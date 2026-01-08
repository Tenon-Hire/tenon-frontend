import '../setup/routerMock';
import { render, screen } from '@testing-library/react';
import RecruiterDashboardPage from '@/features/recruiter/dashboard/RecruiterDashboardPage';
import { useDashboardData } from '@/features/recruiter/dashboard/hooks/useDashboardData';

jest.mock('@/features/recruiter/dashboard/hooks/useDashboardData', () => ({
  useDashboardData: jest.fn(),
}));

const mockUseDashboardData = useDashboardData as jest.MockedFunction<
  typeof useDashboardData
>;

describe('Recruiter simulations list (integration)', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders simulations returned from the backend', async () => {
    mockUseDashboardData.mockReturnValue({
      profile: null,
      profileError: null,
      simulations: [
        {
          id: 'sim_1',
          title: 'Backend Simulation',
          role: 'Backend Engineer',
          createdAt: '2025-12-10T10:00:00Z',
          candidateCount: 3,
        },
      ],
      simError: null,
      loadingProfile: false,
      loadingSimulations: false,
      refresh: jest.fn(),
    });

    render(<RecruiterDashboardPage />);

    expect(screen.getByText('Backend Simulation')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('3 candidate(s)')).toBeInTheDocument();
  });

  it('shows empty state when no simulations exist', async () => {
    mockUseDashboardData.mockReturnValue({
      profile: null,
      profileError: null,
      simulations: [],
      simError: null,
      loadingProfile: false,
      loadingSimulations: false,
      refresh: jest.fn(),
    });

    render(<RecruiterDashboardPage />);

    expect(screen.getByText(/No simulations yet/)).toBeInTheDocument();
    expect(screen.queryByText(/candidate\(s\)/i)).not.toBeInTheDocument();
  });

  it('shows error message when backend call fails', async () => {
    mockUseDashboardData.mockReturnValue({
      profile: null,
      profileError: null,
      simulations: [],
      simError: 'Unauthorized',
      loadingProfile: false,
      loadingSimulations: false,
      refresh: jest.fn(),
    });

    render(<RecruiterDashboardPage />);

    expect(screen.getByText(/Couldn’t load simulations/i)).toBeInTheDocument();
    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
  });
});
