import { render, screen, waitFor } from '@testing-library/react';
import CandidateSessionPage from '@/features/candidate/session/CandidateSessionPage';
import { useCandidateSession } from '@/features/candidate/session/CandidateSessionProvider';
import { useTaskSubmission } from '@/features/candidate/session/hooks/useTaskSubmission';
import { resolveCandidateInviteToken } from '@/features/candidate/api';

jest.mock('@/features/candidate/session/CandidateSessionProvider', () => ({
  useCandidateSession: jest.fn(),
}));

jest.mock('@/features/candidate/session/hooks/useTaskSubmission', () => ({
  useTaskSubmission: jest.fn(),
}));

jest.mock('@/features/candidate/api', () => ({
  ...jest.requireActual('@/features/candidate/api'),
  resolveCandidateInviteToken: jest.fn(),
  getCandidateCurrentTask: jest.fn(),
  pollCandidateTestRun: jest.fn(),
  startCandidateTestRun: jest.fn(),
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

const mockUseCandidateSession = useCandidateSession as jest.Mock;
const mockUseTaskSubmission = useTaskSubmission as jest.Mock;
const mockResolveInvite = resolveCandidateInviteToken as jest.Mock;

const buildSession = (overrides?: {
  token?: string | null;
  authStatus?: 'idle' | 'loading' | 'ready' | 'unauthenticated' | 'error';
  inviteToken?: string | null;
}) => {
  const setToken = jest.fn();
  const token = overrides && 'token' in overrides ? overrides.token : 'token';
  const inviteToken =
    overrides && 'inviteToken' in overrides ? overrides.inviteToken : null;
  return {
    state: {
      inviteToken,
      token,
      candidateSessionId: null,
      bootstrap: null,
      started: false,
      taskState: {
        loading: false,
        error: null,
        isComplete: false,
        completedTaskIds: [],
        currentTask: null,
      },
      authStatus: overrides?.authStatus ?? 'ready',
      authError: null,
    },
    setInviteToken: jest.fn(),
    setToken,
    setCandidateSessionId: jest.fn(),
    setBootstrap: jest.fn(),
    setStarted: jest.fn(),
    setTaskLoading: jest.fn(),
    setTaskLoaded: jest.fn(),
    setTaskError: jest.fn(),
    clearTaskError: jest.fn(),
    reset: jest.fn(),
    loadAccessToken: jest.fn(),
  };
};

describe('CandidateSessionPage unit flow', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUseTaskSubmission.mockReturnValue({
      submitting: false,
      handleSubmit: jest.fn(),
    });
  });

  it('shows error when invite token is missing', async () => {
    mockUseCandidateSession.mockReturnValue(buildSession());

    render(<CandidateSessionPage token="" />);

    await waitFor(() =>
      expect(screen.getByText(/Invite link unavailable/i)).toBeInTheDocument(),
    );
    expect(
      await screen.findByText(
        /This invite link is no longer valid\. Please contact your recruiter to request a new invitation\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Go to Home/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Retry/i)).not.toBeInTheDocument();
  });

  it('shows auth prompt when access token is missing', async () => {
    mockUseCandidateSession.mockReturnValue(
      buildSession({ token: null, authStatus: 'ready' }),
    );

    render(<CandidateSessionPage token="invite-token" />);

    await waitFor(() =>
      expect(screen.getByText('Sign in to continue')).toBeInTheDocument(),
    );
  });

  it('handles 401 errors by clearing token and showing auth', async () => {
    const session = buildSession();
    mockUseCandidateSession.mockReturnValue(session);
    mockResolveInvite.mockRejectedValueOnce({ status: 401 });

    render(<CandidateSessionPage token="invite-token" />);

    await waitFor(() =>
      expect(screen.getByText('Sign in to continue')).toBeInTheDocument(),
    );
    expect(session.setToken).toHaveBeenCalledWith(null);
    expect(screen.getByText('Please sign in again.')).toBeInTheDocument();
  });

  it('handles 403 errors by clearing token and showing auth', async () => {
    const session = buildSession();
    mockUseCandidateSession.mockReturnValue(session);
    mockResolveInvite.mockRejectedValueOnce({ status: 403 });

    render(<CandidateSessionPage token="invite-token" />);

    await waitFor(() =>
      expect(screen.getByText('Sign in to continue')).toBeInTheDocument(),
    );
    expect(session.setToken).toHaveBeenCalledWith(null);
  });

  it.each([400, 404, 409, 410])(
    'shows guidance when invite link fails (%s)',
    async (status) => {
      mockUseCandidateSession.mockReturnValue(buildSession());
      mockResolveInvite.mockRejectedValueOnce({ status });

      render(<CandidateSessionPage token="invite-token" />);

      expect(
        await screen.findByText(/Invite link unavailable/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/contact your recruiter to request a new invitation/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Go to Home/i }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Retry/i)).not.toBeInTheDocument();
    },
  );

  it('shows error view for non-auth bootstrap failures', async () => {
    mockUseCandidateSession.mockReturnValue(buildSession());
    mockResolveInvite.mockRejectedValueOnce({ status: 500 });

    render(<CandidateSessionPage token="invite-token" />);

    await waitFor(() =>
      expect(screen.getByText('Unable to load simulation')).toBeInTheDocument(),
    );
  });
});
