import '../setup/routerMock';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecruiterDashboardContent, {
  RecruiterProfile,
} from '@/app/(private)/(recruiter)/dashboard/RecruiterDashboardContent';
import { inviteCandidate, listSimulations } from '@/lib/recruiterApi';

jest.mock('@/lib/recruiterApi', () => ({
  listSimulations: jest.fn(),
  inviteCandidate: jest.fn(),
}));

const mockedListSimulations = listSimulations as jest.MockedFunction<
  typeof listSimulations
>;
const mockedInviteCandidate = inviteCandidate as jest.MockedFunction<
  typeof inviteCandidate
>;

describe('RecruiterDashboardContent', () => {
  const profile: RecruiterProfile = {
    id: 1,
    name: 'Jordan Doe',
    email: 'jordan@example.com',
    role: 'recruiter',
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders profile details when available', async () => {
    mockedListSimulations.mockResolvedValueOnce([]);

    render(<RecruiterDashboardContent profile={profile} error={null} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Jordan Doe')).toBeInTheDocument();
    expect(screen.getByText('jordan@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Role:/)).toHaveTextContent('Role: recruiter');

    expect(await screen.findByText('No simulations yet.')).toBeInTheDocument();
  });

  it('shows an error message when provided', async () => {
    mockedListSimulations.mockResolvedValueOnce([]);

    render(
      <RecruiterDashboardContent
        profile={null}
        error="Unable to fetch profile"
      />,
    );

    expect(screen.getByText('Unable to fetch profile')).toBeInTheDocument();
    expect(await screen.findByText('No simulations yet.')).toBeInTheDocument();
  });

  it('shows empty state when recruiter has no simulations', async () => {
    mockedListSimulations.mockResolvedValueOnce([]);

    render(<RecruiterDashboardContent profile={null} error={null} />);

    expect(await screen.findByText('No simulations yet.')).toBeInTheDocument();
  });

  it('renders simulations list with metadata', async () => {
    mockedListSimulations.mockResolvedValueOnce([
      {
        id: 'sim_1',
        title: 'Backend Engineer - Node',
        role: 'Backend Engineer',
        createdAt: '2025-12-10T10:00:00Z',
        candidateCount: 2,
      },
    ]);

    render(<RecruiterDashboardContent profile={null} error={null} />);

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
    mockedListSimulations.mockRejectedValueOnce({
      message: 'Unauthorized',
      status: 401,
    });

    render(<RecruiterDashboardContent profile={null} error={null} />);

    expect(
      await screen.findByText('Couldn’t load simulations'),
    ).toBeInTheDocument();
    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
  });

  it('invites a candidate and displays invite url + token', async () => {
    const user = userEvent.setup();

    mockedListSimulations
      .mockResolvedValueOnce([
        {
          id: 'sim_1',
          title: 'Sim 1',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'sim_1',
          title: 'Sim 1',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ]);

    mockedInviteCandidate.mockResolvedValueOnce({
      candidateSessionId: 'cs_1',
      token: 'tok_123',
      inviteUrl: 'http://localhost:3000/candidate/tok_123',
    });

    render(<RecruiterDashboardContent profile={null} error={null} />);

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

    mockedListSimulations
      .mockResolvedValueOnce([
        {
          id: 'sim_1',
          title: 'Sim 1',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'sim_1',
          title: 'Sim 1',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ]);

    mockedInviteCandidate.mockResolvedValueOnce({
      candidateSessionId: 'cs_1',
      token: 'tok_123',
      inviteUrl: 'http://localhost:3000/candidate/tok_123',
    });

    render(<RecruiterDashboardContent profile={null} error={null} />);

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
      'http://localhost:3000/candidate/tok_123',
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
    mockedListSimulations.mockResolvedValue([
      {
        id: 'sim_1',
        title: 'Sim 1',
        role: 'Backend',
        createdAt: '2025-12-10T10:00:00Z',
      },
    ]);

    mockedInviteCandidate.mockRejectedValueOnce({ message: 'Invite failed' });

    render(<RecruiterDashboardContent profile={null} error={null} />);

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
    mockedListSimulations.mockRejectedValueOnce({ message: 'Auth failed' });

    render(<RecruiterDashboardContent profile={null} error={null} />);

    expect(
      await screen.findByText('Couldn’t load simulations'),
    ).toBeInTheDocument();
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

    mockedListSimulations
      .mockResolvedValueOnce([
        {
          id: 'sim_2',
          title: 'Sim 2',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'sim_2',
          title: 'Sim 2',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ]);

    mockedInviteCandidate.mockResolvedValueOnce({
      candidateSessionId: 'cs_2',
      token: 'tok_456',
      inviteUrl: 'http://localhost:3000/candidate/tok_456',
    });

    render(<RecruiterDashboardContent profile={null} error={null} />);

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
      'http://localhost:3000/candidate/tok_456',
    );

    await user.click(screen.getByRole('button', { name: /Dismiss/i }));
    expect(
      screen.queryByText(/Invite created for Alex/i),
    ).not.toBeInTheDocument();
  });

  it('auto-dismisses success toast after timeout', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    mockedListSimulations
      .mockResolvedValueOnce([
        {
          id: 'sim_3',
          title: 'Sim 3',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'sim_3',
          title: 'Sim 3',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ]);

    mockedInviteCandidate.mockResolvedValueOnce({
      candidateSessionId: 'cs_3',
      token: 'tok_789',
      inviteUrl: 'http://localhost:3000/candidate/tok_789',
    });

    render(<RecruiterDashboardContent profile={null} error={null} />);

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

    mockedListSimulations
      .mockResolvedValueOnce([
        {
          id: 'sim_4',
          title: 'Sim 4',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'sim_4',
          title: 'Sim 4',
          role: 'Backend',
          createdAt: '2025-12-10T10:00:00Z',
        },
      ]);

    mockedInviteCandidate.mockResolvedValueOnce({
      candidateSessionId: 'cs_4',
      token: 'tok_999',
      inviteUrl: 'http://localhost:3000/candidate/tok_999',
    });

    render(<RecruiterDashboardContent profile={null} error={null} />);

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
