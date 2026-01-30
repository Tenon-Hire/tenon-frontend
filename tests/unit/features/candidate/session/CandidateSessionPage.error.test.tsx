import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
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

jest.mock('@/features/candidate/session/task/components/WorkspacePanel', () => ({
  __esModule: true,
  WorkspacePanel: (props: Record<string, unknown>) => (
    <div data-testid="workspace-panel">{JSON.stringify(props)}</div>
  ),
}));

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
  StateMessage: ({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) => (
    <div data-testid="state-message">
      {title}
      {description ? `|${description}` : ''}
      {action}
    </div>
  ),
}));

jest.mock('@/features/candidate/session/components/CandidateSessionSkeleton', () => ({
  CandidateSessionSkeleton: ({ message }: { message: string }) => (
    <div data-testid="skeleton">{message}</div>
  ),
}));

const resolveInviteMock = jest.fn();
const getCurrentTaskMock = jest.fn();

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
    resolveInviteMock.mockRejectedValue(new (require('@/lib/api/candidate').HttpError)(410));
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
    resolveInviteMock.mockRejectedValue(new (require('@/lib/api/candidate').HttpError)(404));
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

});
