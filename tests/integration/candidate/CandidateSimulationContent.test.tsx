import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CandidateSessionPage from '@/features/candidate/session/CandidateSessionPage';
import { CandidateSessionProvider } from '@/features/candidate/session/CandidateSessionProvider';
import {
  getCandidateCurrentTask,
  resolveCandidateInviteToken,
} from '@/lib/api/candidate';
import { setAuthToken } from '@/lib/auth';

jest.mock('@/lib/api/candidate', () => {
  const actual = jest.requireActual('@/lib/api/candidate');
  return {
    __esModule: true,
    ...actual,
    getCandidateCurrentTask: jest.fn(),
    resolveCandidateInviteToken: jest.fn(),
  };
});

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
const resolveMock = resolveCandidateInviteToken as unknown as jest.Mock;

function renderWithProvider(ui: React.ReactNode) {
  return render(<CandidateSessionProvider>{ui}</CandidateSessionProvider>);
}

describe('CandidateSessionPage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    Object.values(routerMock).forEach((fn) => fn.mockReset());
    sessionStorage.clear();
    localStorage.clear();
    resolveMock.mockResolvedValue({
      candidateSessionId: 123,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend' },
    });
  });

  it('claims invite and starts current task', async () => {
    resolveMock.mockResolvedValueOnce({
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

    setAuthToken('candidate-token');
    renderWithProvider(<CandidateSessionPage token="VALID_TOKEN" />);

    expect(
      await screen.findByText('Backend Engineer Simulation'),
    ).toBeInTheDocument();

    await waitFor(() => expect(resolveMock).toHaveBeenCalledTimes(1));

    expect(
      await screen.findByRole('button', { name: /Start simulation/i }),
    ).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Start simulation/i }));

    expect(await screen.findByText(/Role:\s*Backend/i)).toBeInTheDocument();
    expect(await screen.findByText('Day 1 — Architecture')).toBeInTheDocument();
    expect(currentTaskMock).toHaveBeenCalledWith(123, 'candidate-token');
  });

  it('shows verification screen when access token is missing', async () => {
    renderWithProvider(<CandidateSessionPage token="VALID_TOKEN" />);

    expect(await screen.findByText(/Verify your invite/i)).toBeInTheDocument();
  });

  it('returns to verification when the stored token is invalid', async () => {
    setAuthToken('candidate-token');
    resolveMock.mockRejectedValueOnce({ status: 401 });

    renderWithProvider(<CandidateSessionPage token="VALID_TOKEN" />);

    expect(await screen.findByText(/Verify your invite/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/verification session expired/i),
    ).toBeInTheDocument();
  });
});
