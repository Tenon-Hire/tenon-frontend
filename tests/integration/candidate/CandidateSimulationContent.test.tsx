import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CandidateSessionPage from '@/features/candidate/session/CandidateSessionPage';
import { CandidateSessionProvider } from '@/features/candidate/session/CandidateSessionProvider';
import {
  HttpError,
  getCandidateCurrentTask,
  claimCandidateInvite,
} from '@/lib/api/candidate';

jest.mock('@/lib/api/candidate', () => {
  const actual = jest.requireActual('@/lib/api/candidate');
  return {
    __esModule: true,
    ...actual,
    getCandidateCurrentTask: jest.fn(),
    claimCandidateInvite: jest.fn(),
  };
});

jest.mock('@auth0/nextjs-auth0/client', () => ({
  getAccessToken: jest.fn(),
  useUser: () => ({ user: { email: 'user@example.com' } }),
}));

const routerMock = {
  push: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

const currentTaskMock = getCandidateCurrentTask as unknown as jest.Mock;
const claimMock = claimCandidateInvite as unknown as jest.Mock;
const getAccessTokenMock = jest.requireMock('@auth0/nextjs-auth0/client')
  .getAccessToken as jest.Mock;

function renderWithProvider(ui: React.ReactNode) {
  return render(<CandidateSessionProvider>{ui}</CandidateSessionProvider>);
}

describe('CandidateSessionPage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    Object.values(routerMock).forEach((fn) => fn.mockReset());
    sessionStorage.clear();
    getAccessTokenMock.mockResolvedValue('auth-token');
    claimMock.mockResolvedValue({
      candidateSessionId: 123,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend' },
    });
  });

  it('claims invite and starts current task', async () => {
    claimMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: 'in_progress',
      simulation: { title: 'Backend Engineer Simulation', role: 'Backend' },
    });
    currentTaskMock.mockResolvedValue({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 1,
        dayIndex: 1,
        type: 'design',
        title: 'Day 1 — Architecture',
        description: 'Plan it',
      },
    });

    renderWithProvider(<CandidateSessionPage token="VALID_TOKEN" />);

    expect(
      await screen.findByText('Backend Engineer Simulation'),
    ).toBeInTheDocument();

    await waitFor(() => expect(claimMock).toHaveBeenCalledTimes(1));

    expect(
      await screen.findByRole('button', { name: /Start simulation/i }),
    ).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Start simulation/i }));

    expect(await screen.findByText(/Role:\s*Backend/i)).toBeInTheDocument();
    expect(await screen.findByText('Day 1 — Architecture')).toBeInTheDocument();
    expect(currentTaskMock).toHaveBeenCalledWith(123, 'auth-token');
  });

  it('renders mismatch state when claim is rejected', async () => {
    claimMock.mockRejectedValue(
      Object.assign(new HttpError(403, 'invite@example.com'), {
        invitedEmail: 'invite@example.com',
      }),
    );

    renderWithProvider(<CandidateSessionPage token="VALID_TOKEN" />);

    expect(await screen.findByText(/invite@example.com/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Log out/i }),
    ).toBeInTheDocument();
  });

  it('shows auth session error when access token load fails', async () => {
    getAccessTokenMock.mockRejectedValueOnce(new Error('No session'));

    renderWithProvider(<CandidateSessionPage token="VALID_TOKEN" />);

    expect(
      await screen.findByText(/Unable to load your login session/i),
    ).toBeInTheDocument();
  });
});
