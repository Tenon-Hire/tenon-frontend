import '../setup/routerMock';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecruiterDashboardPage from '@/features/recruiter/dashboard/RecruiterDashboardPage';
import type { RecruiterProfile } from '@/types/recruiter';
import { inviteCandidate } from '@/lib/api/recruiter';
import { useDashboardData } from '@/features/recruiter/dashboard/hooks/useDashboardData';

jest.mock('@/lib/api/recruiter', () => ({
  listSimulations: jest.fn(),
  inviteCandidate: jest.fn(),
}));

jest.mock('@/features/recruiter/dashboard/hooks/useDashboardData', () => ({
  useDashboardData: jest.fn(),
}));

const mockedInviteCandidate = inviteCandidate as jest.MockedFunction<
  typeof inviteCandidate
>;
const mockUseDashboardData = useDashboardData as jest.MockedFunction<
  typeof useDashboardData
>;

describe('RecruiterDashboardPage', () => {
  const profile: RecruiterProfile = {
    id: 1,
    name: 'Jordan Doe',
    email: 'jordan@example.com',
    role: 'recruiter',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    mockUseDashboardData.mockReturnValue({
      profile: null,
      profileError: null,
      simulations: [],
      simError: null,
      loadingProfile: false,
      loadingSimulations: false,
      refresh: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders profile details when available', async () => {
    mockUseDashboardData.mockReturnValue({
      profile,
      profileError: null,
      simulations: [],
      simError: null,
      loadingProfile: false,
      loadingSimulations: false,
      refresh: jest.fn(),
    });

    render(<RecruiterDashboardPage />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Jordan Doe')).toBeInTheDocument();
    expect(screen.getByText('jordan@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Role:/)).toHaveTextContent('Role: recruiter');

    expect(await screen.findByText('No simulations yet.')).toBeInTheDocument();
  });

  it('shows an error message when provided', async () => {
    mockUseDashboardData.mockReturnValue({
      profile: null,
      profileError: 'Unable to fetch profile',
      simulations: [],
      simError: null,
      loadingProfile: false,
      loadingSimulations: false,
      refresh: jest.fn(),
    });

    render(<RecruiterDashboardPage />);

    expect(screen.getByText('Unable to fetch profile')).toBeInTheDocument();
    expect(screen.getByText('No simulations yet.')).toBeInTheDocument();
  });

  it('shows empty state when recruiter has no simulations', async () => {
    render(<RecruiterDashboardPage />);

    expect(screen.getByText('No simulations yet.')).toBeInTheDocument();
  });

  it('renders simulations list with metadata', async () => {
    mockUseDashboardData.mockReturnValue({
      profile: null,
      profileError: null,
      simulations: [
        {
          id: 'sim_1',
          title: 'Backend Engineer - Node',
          role: 'Backend Engineer',
          createdAt: '2025-12-10T10:00:00Z',
          candidateCount: 2,
        },
      ],
      simError: null,
      loadingProfile: false,
      loadingSimulations: false,
      refresh: jest.fn(),
    });

    render(<RecruiterDashboardPage />);

    expect(
      await screen.findByText('Backend Engineer - Node'),
    ).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('2 candidate(s)')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Invite candidate' }),
    ).toBeInTheDocument();
  });

  it('shows inline error state when listSimulations fails', async () => {
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

    expect(screen.getByText('Couldn’t load simulations')).toBeInTheDocument();
    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
  });

  it('invites a candidate and displays invite url + token', async () => {
    const user = userEvent.setup();

    mockUseDashboardData.mockReturnValue({
      profile: null,
      profileError: null,
      simulations: [
        {
          id: 'sim_1',
          title: 'Sim 1',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ],
      simError: null,
      loadingProfile: false,
      loadingSimulations: false,
      refresh: jest.fn(),
    });

    mockedInviteCandidate.mockResolvedValueOnce({
      candidateSessionId: 'cs_1',
      token: 'tok_123',
      inviteUrl: 'http://localhost:3000/candidate/session/tok_123',
    });

    render(<RecruiterDashboardPage />);

    const inviteBtn = await screen.findByRole('button', {
      name: 'Invite candidate',
    });
    await user.click(inviteBtn);

    await user.type(screen.getByLabelText(/Candidate name/i), 'Jane Doe');
    await user.type(
      screen.getByLabelText(/Candidate email/i),
      'jane@example.com',
    );

    const createBtn = screen.getByRole('button', { name: /Create invite/i });
    await user.click(createBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    expect(
      await screen.findByText(
        'Invite created for Jane Doe (jane@example.com).',
      ),
    ).toBeInTheDocument();

    expect(mockedInviteCandidate).toHaveBeenCalledWith(
      'sim_1',
      'Jane Doe',
      'jane@example.com',
    );
  });

  it('copies invite url from toast and resets copied state', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    mockUseDashboardData.mockReturnValue({
      profile: null,
      profileError: null,
      simulations: [
        {
          id: 'sim_1',
          title: 'Sim 1',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ],
      simError: null,
      loadingProfile: false,
      loadingSimulations: false,
      refresh: jest.fn(),
    });

    mockedInviteCandidate.mockResolvedValueOnce({
      candidateSessionId: 'cs_1',
      token: 'tok_123',
      inviteUrl: 'http://localhost:3000/candidate/session/tok_123',
    });

    render(<RecruiterDashboardPage />);

    const inviteBtn = await screen.findByRole('button', {
      name: 'Invite candidate',
    });
    await user.click(inviteBtn);
    await user.type(screen.getByLabelText(/Candidate name/i), 'Jane Doe');
    await user.type(
      screen.getByLabelText(/Candidate email/i),
      'jane@example.com',
    );
    await user.click(screen.getByRole('button', { name: /Create invite/i }));

    const copyBtn = await screen.findByRole('button', { name: /Copy/i });
    await user.click(copyBtn);

    expect(writeText).toHaveBeenCalledWith(
      'http://localhost:3000/candidate/session/tok_123',
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Copied/i }),
      ).toBeInTheDocument(),
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Copy/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /Dismiss/i }));
    expect(
      screen.queryByText(/Invite created for Jane Doe/i),
    ).not.toBeInTheDocument();
  }, 15000);

  it('shows invite error when backend fails', async () => {
    mockUseDashboardData.mockReturnValue({
      profile: null,
      profileError: null,
      simulations: [
        {
          id: 'sim_1',
          title: 'Sim 1',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ],
      simError: null,
      loadingProfile: false,
      loadingSimulations: false,
      refresh: jest.fn(),
    });

    mockedInviteCandidate.mockRejectedValueOnce({ message: 'Invite failed' });

    render(<RecruiterDashboardPage />);

    const inviteBtn = await screen.findByRole('button', {
      name: 'Invite candidate',
    });
    fireEvent.click(inviteBtn);
    fireEvent.change(screen.getByLabelText(/Candidate name/i), {
      target: { value: 'Joe' },
    });
    fireEvent.change(screen.getByLabelText(/Candidate email/i), {
      target: { value: 'joe@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create invite/i }));

    await waitFor(() => expect(mockedInviteCandidate).toHaveBeenCalled());
    expect(screen.getAllByText(/Invite failed/).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it('shows inline load error when listSimulations throws', async () => {
    mockUseDashboardData.mockReturnValue({
      profile: null,
      profileError: null,
      simulations: [],
      simError: 'Auth failed',
      loadingProfile: false,
      loadingSimulations: false,
      refresh: jest.fn(),
    });

    render(<RecruiterDashboardPage />);

    expect(screen.getByText('Couldn’t load simulations')).toBeInTheDocument();
    expect(screen.getByText('Auth failed')).toBeInTheDocument();
  });

  it('can dismiss success toast and clear copied indicator', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    mockUseDashboardData.mockReturnValue({
      profile: null,
      profileError: null,
      simulations: [
        {
          id: 'sim_2',
          title: 'Sim 2',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ],
      simError: null,
      loadingProfile: false,
      loadingSimulations: false,
      refresh: jest.fn(),
    });

    mockedInviteCandidate.mockResolvedValueOnce({
      candidateSessionId: 'cs_2',
      token: 'tok_456',
      inviteUrl: 'http://localhost:3000/candidate/session/tok_456',
    });

    mockUseDashboardData.mockReturnValue({
      profile: null,
      profileError: null,
      simulations: [
        {
          id: 'sim_2',
          title: 'Sim 2',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ],
      simError: null,
      loadingProfile: false,
      loadingSimulations: false,
      refresh: jest.fn(),
    });

    render(<RecruiterDashboardPage />);

    const inviteBtn = await screen.findByRole('button', {
      name: 'Invite candidate',
    });
    await user.click(inviteBtn);
    await user.type(screen.getByLabelText(/Candidate name/i), 'Alex');
    await user.type(
      screen.getByLabelText(/Candidate email/i),
      'alex@example.com',
    );
    await user.click(screen.getByRole('button', { name: /Create invite/i }));

    const copyBtn = await screen.findByRole('button', { name: /Copy/i });
    await user.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith(
      'http://localhost:3000/candidate/session/tok_456',
    );

    await user.click(screen.getByRole('button', { name: /Dismiss/i }));
    expect(
      screen.queryByText(/Invite created for Alex/i),
    ).not.toBeInTheDocument();
  });

  it('auto-dismisses success toast after timeout', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    mockUseDashboardData.mockReturnValue({
      profile: null,
      profileError: null,
      simulations: [
        {
          id: 'sim_3',
          title: 'Sim 3',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ],
      simError: null,
      loadingProfile: false,
      loadingSimulations: false,
      refresh: jest.fn(),
    });

    mockedInviteCandidate.mockResolvedValueOnce({
      candidateSessionId: 'cs_3',
      token: 'tok_789',
      inviteUrl: 'http://localhost:3000/candidate/session/tok_789',
    });

    render(<RecruiterDashboardPage />);

    const inviteBtn = await screen.findByRole('button', {
      name: 'Invite candidate',
    });
    await user.click(inviteBtn);
    await user.type(screen.getByLabelText(/Candidate name/i), 'Jamie');
    await user.type(
      screen.getByLabelText(/Candidate email/i),
      'jamie@example.com',
    );
    await user.click(screen.getByRole('button', { name: /Create invite/i }));

    expect(
      await screen.findByText(/Invite created for Jamie/i),
    ).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(7000);
    });

    expect(
      screen.queryByText(/Invite created for Jamie/i),
    ).not.toBeInTheDocument();
  });

  it('clears existing copy timeout when copying multiple times', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    mockUseDashboardData.mockReturnValue({
      profile: null,
      profileError: null,
      simulations: [
        {
          id: 'sim_4',
          title: 'Sim 4',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ],
      simError: null,
      loadingProfile: false,
      loadingSimulations: false,
      refresh: jest.fn(),
    });

    mockedInviteCandidate.mockResolvedValueOnce({
      candidateSessionId: 'cs_4',
      token: 'tok_999',
      inviteUrl: 'http://localhost:3000/candidate/session/tok_999',
    });

    render(<RecruiterDashboardPage />);

    const inviteBtn = await screen.findByRole('button', {
      name: 'Invite candidate',
    });
    await user.click(inviteBtn);
    await user.type(screen.getByLabelText(/Candidate name/i), 'Chris');
    await user.type(
      screen.getByLabelText(/Candidate email/i),
      'chris@example.com',
    );
    await user.click(screen.getByRole('button', { name: /Create invite/i }));

    const copyBtn = await screen.findByRole('button', { name: /Copy/i });
    await user.click(copyBtn);
    await user.click(copyBtn);

    expect(writeText).toHaveBeenCalledTimes(2);

    act(() => {
      jest.advanceTimersByTime(1800);
    });

    expect(screen.getByRole('button', { name: /Copy/i })).toBeInTheDocument();
  });
});
