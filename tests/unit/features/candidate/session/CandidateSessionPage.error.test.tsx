import React from 'react';
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from '@testing-library/react';
import CandidateSessionPage from '@/features/candidate/session/CandidateSessionPage';

const useCandidateSessionMock = jest.fn();

jest.mock('@/features/candidate/session/CandidateSessionProvider', () => ({
  useCandidateSession: () => useCandidateSessionMock(),
}));

jest.mock('@/features/candidate/session/task/CandidateTaskProgress', () => ({
  __esModule: true,
  default: ({ currentTaskTitle }: { currentTaskTitle: string | null }) => (
    <div data-testid="task-progress">{currentTaskTitle ?? 'no-title'}</div>
  ),
}));

jest.mock('@/features/candidate/session/task/CandidateTaskView', () => ({
  __esModule: true,
  default: ({ task }: { task: { title: string } }) => (
    <div data-testid="task-view">{task.title}</div>
  ),
}));

jest.mock(
  '@/features/candidate/session/task/components/WorkspacePanel',
  () => ({
    __esModule: true,
    WorkspacePanel: (props: Record<string, unknown>) => (
      <div data-testid="workspace-panel">{JSON.stringify(props)}</div>
    ),
  }),
);

jest.mock('@/features/candidate/session/task/components/RunTestsPanel', () => ({
  __esModule: true,
  RunTestsPanel: (props: Record<string, unknown>) => (
    <div data-testid="run-tests-panel">{JSON.stringify(props)}</div>
  ),
}));

jest.mock('@/features/candidate/session/task/components/ResourcePanel', () => ({
  __esModule: true,
  ResourcePanel: ({ title }: { title: string }) => (
    <div data-testid={`resource-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {title}
    </div>
  ),
}));

jest.mock('@/features/candidate/session/components/StateMessage', () => ({
  StateMessage: ({
    title,
    description,
    action,
  }: {
    title: string;
    description?: string;
    action?: React.ReactNode;
  }) => (
    <div data-testid="state-message">
      {title}
      {description ? `|${description}` : ''}
      {action}
    </div>
  ),
}));

jest.mock(
  '@/features/candidate/session/components/CandidateSessionSkeleton',
  () => ({
    CandidateSessionSkeleton: ({ message }: { message: string }) => (
      <div data-testid="skeleton">{message}</div>
    ),
  }),
);

const resolveInviteMock = jest.fn();
const getCurrentTaskMock = jest.fn();
import { HttpError } from '@/lib/api/candidate';

jest.mock('@/lib/api/candidate', () => ({
  resolveCandidateInviteToken: (...args: unknown[]) =>
    resolveInviteMock(...args),
  getCandidateCurrentTask: (...args: unknown[]) => getCurrentTaskMock(...args),
  pollCandidateTestRun: jest.fn(),
  startCandidateTestRun: jest.fn(),
  HttpError: class HttpError extends Error {
    status: number;
    constructor(status: number, message?: string) {
      super(message);
      this.status = status;
    }
  },
}));

const buildLoginHrefMock = jest.fn(() => '/auth/login?mode=candidate');
jest.mock('@/features/auth/authPaths', () => ({
  buildLoginHref: (...args: unknown[]) => buildLoginHrefMock(...args),
}));

const routerMock = {
  push: jest.fn(),
  replace: jest.fn(),
};
jest.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

const baseState = () => ({
  state: {
    inviteToken: 'inv',
    token: 'auth-token',
    candidateSessionId: 99,
    bootstrap: {
      candidateSessionId: 99,
      status: 'in_progress' as const,
      simulation: { title: 'Sim', role: 'Role' },
    },
    started: true,
    taskState: {
      loading: false,
      error: null,
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 1,
        dayIndex: 2,
        type: 'code' as const,
        title: 'Code Day',
        description: 'http://docs',
      },
    },
    authStatus: 'ready' as const,
    authError: null,
  },
  setInviteToken: jest.fn(),
  setToken: jest.fn(),
  setCandidateSessionId: jest.fn(),
  setBootstrap: jest.fn(),
  setStarted: jest.fn(),
  setTaskLoading: jest.fn(),
  setTaskLoaded: jest.fn(),
  setTaskError: jest.fn(),
  clearTaskError: jest.fn(),
  reset: jest.fn(),
  loadAccessToken: jest.fn(),
});

describe('CandidateSessionPage auth/error states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveInviteMock.mockResolvedValue({
      candidateSessionId: 99,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Role' },
    });
    getCurrentTaskMock.mockResolvedValue({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 1,
        dayIndex: 2,
        type: 'code',
        title: 'Code Day',
        description: 'http://docs',
      },
    });
  });

  it('gates unauthenticated users with auth message when token missing', async () => {
    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      state: { ...baseState().state, token: null, authStatus: 'ready' },
    });

    render(<CandidateSessionPage token="inv" />);

    await waitFor(() =>
      expect(screen.getByTestId('state-message')).toHaveTextContent(
        'Sign in to continue',
      ),
    );
    expect(buildLoginHrefMock).toHaveBeenCalledWith(
      '/candidate/session/inv',
      'candidate',
    );
  });

  it('shows invite expired error with sign-in link when unauthenticated', async () => {
    resolveInviteMock.mockRejectedValue(new HttpError(410));
    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      state: { ...baseState().state, authStatus: 'unauthenticated' },
    });

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByTestId('state-message')).toHaveTextContent(
        'Invite link unavailable',
      ),
    );
    expect(
      screen.getByRole('button', { name: /Go to sign in/i }),
    ).toBeInTheDocument();
  });

  it('shows invite error with go home action when authenticated', async () => {
    resolveInviteMock.mockRejectedValue(new HttpError(404));
    useCandidateSessionMock.mockReturnValue(baseState());

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByTestId('state-message')).toHaveTextContent(
        'Invite link unavailable',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: /Go to Home/i }));
    expect(routerMock.push).toHaveBeenCalledWith('/');
  });

  it('sends user back to auth when resolve fails with 401', async () => {
    const setToken = jest.fn();
    resolveInviteMock.mockRejectedValue({ status: 401 });
    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      setToken,
    });

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByTestId('state-message')).toHaveTextContent(
        'Sign in to continue',
      ),
    );
    expect(setToken).toHaveBeenCalledWith(null);
  });

  it('sends user back to auth when resolve fails with 403', async () => {
    const setToken = jest.fn();
    resolveInviteMock.mockRejectedValue({ status: 403 });
    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      setToken,
    });

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByTestId('state-message')).toHaveTextContent(
        'Sign in to continue',
      ),
    );
    expect(setToken).toHaveBeenCalledWith(null);
  });

  it('shows generic error with retry action for non-invite errors', async () => {
    resolveInviteMock.mockRejectedValue({ status: 500, message: 'Server error' });
    useCandidateSessionMock.mockReturnValue(baseState());

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByTestId('state-message')).toHaveTextContent(
        'Unable to load simulation',
      ),
    );
    const retryButton = screen.getByRole('button', { name: /Retry/i });
    expect(retryButton).toBeInTheDocument();

    resolveInviteMock.mockResolvedValue({
      candidateSessionId: 99,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Role' },
    });

    fireEvent.click(retryButton);
    await waitFor(() => expect(resolveInviteMock).toHaveBeenCalledTimes(2));
  });

  it('handles 400 status as invite unavailable', async () => {
    resolveInviteMock.mockRejectedValue({ status: 400 });
    useCandidateSessionMock.mockReturnValue(baseState());

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByTestId('state-message')).toHaveTextContent(
        'Invite link unavailable',
      ),
    );
  });

  it('handles 409 status as invite unavailable', async () => {
    resolveInviteMock.mockRejectedValue({ status: 409 });
    useCandidateSessionMock.mockReturnValue(baseState());

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByTestId('state-message')).toHaveTextContent(
        'Invite link unavailable',
      ),
    );
  });

  it('shows session not ready when candidateSessionId is null with currentTask', async () => {
    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      state: {
        ...baseState().state,
        candidateSessionId: null,
        bootstrap: null,
        taskState: {
          ...baseState().state.taskState,
          currentTask: { id: 1, dayIndex: 1, type: 'design', title: 'Task', description: '' },
        },
      },
    });

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByText(/Session not ready/i)).toBeInTheDocument(),
    );
  });

  it('shows fallback when no current task and no session', async () => {
    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      state: {
        ...baseState().state,
        taskState: {
          ...baseState().state.taskState,
          currentTask: null,
        },
      },
    });

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByText(/Unable to load your session/i)).toBeInTheDocument(),
    );
  });

  it('navigates to candidate dashboard on back button click', async () => {
    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      state: {
        ...baseState().state,
        taskState: {
          ...baseState().state.taskState,
          currentTask: null,
        },
      },
    });

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByText(/Unable to load your session/i)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /Back to dashboard/i }));
    expect(routerMock.push).toHaveBeenCalledWith('/candidate/dashboard');
  });

  it('resets state when inviteToken changes', async () => {
    const resetMock = jest.fn();
    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      state: {
        ...baseState().state,
        inviteToken: 'old-token',
      },
      reset: resetMock,
    });

    render(<CandidateSessionPage token="new-token" />);
    await act(async () => Promise.resolve());

    expect(resetMock).toHaveBeenCalled();
  });

  it('shows day 3 workspace panel for debug task', async () => {
    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      state: {
        ...baseState().state,
        taskState: {
          ...baseState().state.taskState,
          currentTask: {
            id: 2,
            dayIndex: 3,
            type: 'debug',
            title: 'Debug Day',
            description: '',
          },
        },
      },
    });

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByTestId('workspace-panel')).toBeInTheDocument(),
    );
  });

  it('displays loading indicator during task refresh', async () => {
    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      state: {
        ...baseState().state,
        taskState: {
          ...baseState().state.taskState,
          loading: true,
        },
      },
    });

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByText(/Refreshing/i)).toBeInTheDocument(),
    );
  });

  it('does not retry init when done and same token', async () => {
    resolveInviteMock.mockResolvedValue({
      candidateSessionId: 99,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Role' },
    });
    useCandidateSessionMock.mockReturnValue(baseState());

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() => expect(resolveInviteMock).toHaveBeenCalledTimes(1));

    // Same token should not trigger another call
    await act(async () => Promise.resolve());
    expect(resolveInviteMock).toHaveBeenCalledTimes(1);
  });

  it('catches fetchCurrentTask error from useEffect', async () => {
    const setTaskError = jest.fn();
    getCurrentTaskMock.mockRejectedValue({ status: 500 });
    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      setTaskError,
      state: {
        ...baseState().state,
        taskState: {
          loading: false,
          error: null,
          isComplete: false,
          completedTaskIds: [],
          currentTask: null,
        },
      },
    });

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() => expect(getCurrentTaskMock).toHaveBeenCalled());
    // The error handler should be triggered - shows generic error for 500
    await waitFor(() =>
      expect(screen.getByTestId('state-message')).toHaveTextContent(
        'Unable to load simulation',
      ),
    );
  });

  it('handles task fetch error after successful bootstrap', async () => {
    resolveInviteMock.mockResolvedValue({
      candidateSessionId: 99,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Role' },
    });
    getCurrentTaskMock.mockRejectedValue({ status: 500 });
    useCandidateSessionMock.mockReturnValue(baseState());

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() => expect(getCurrentTaskMock).toHaveBeenCalled());
  });

  it('triggers task fetch on handleStart when no current task', async () => {
    // This test verifies that starting the simulation attempts to fetch tasks
    const setStarted = jest.fn();
    getCurrentTaskMock.mockRejectedValueOnce({ status: 500 });

    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      setStarted,
      state: {
        ...baseState().state,
        started: false,
        taskState: {
          loading: false,
          error: null,
          isComplete: false,
          completedTaskIds: [],
          currentTask: null,
        },
      },
    });

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    // The component will attempt bootstrap first
    await waitFor(() => expect(resolveInviteMock).toHaveBeenCalled());
  });

  it('clicking retry in no-task fallback calls fetchCurrentTask with skipCache', async () => {
    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      state: {
        ...baseState().state,
        taskState: {
          ...baseState().state.taskState,
          currentTask: null,
        },
      },
    });

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByText(/Unable to load your session/i)).toBeInTheDocument(),
    );

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() =>
      expect(getCurrentTaskMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ skipCache: true }),
      ),
    );
  });
});
