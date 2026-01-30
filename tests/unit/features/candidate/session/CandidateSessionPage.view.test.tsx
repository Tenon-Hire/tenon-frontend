import React from 'react';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
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
  StateMessage: ({ title }: { title: string }) => (
    <div data-testid="state-message">{title}</div>
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

jest.mock('@/lib/api/candidate', () => ({
  resolveCandidateInviteToken: (...args: unknown[]) =>
    resolveInviteMock(...args),
  getCandidateCurrentTask: (...args: unknown[]) => getCurrentTaskMock(...args),
  pollCandidateTestRun: jest.fn(),
  startCandidateTestRun: jest.fn(),
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

const buildState = (overrides?: Partial<ReturnType<typeof baseState>>) => ({
  ...baseState(),
  ...(overrides ?? {}),
});

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
        type: 'code',
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

describe('CandidateSessionPage view rendering', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
    routerMock.push.mockReset();
    routerMock.replace.mockReset();
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

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders running view with workspace and tests for day 2 code task', async () => {
    useCandidateSessionMock.mockReturnValue(buildState());

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByTestId('run-tests-panel')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('workspace-panel')).toBeInTheDocument();
    expect(screen.getByTestId('task-view')).toHaveTextContent('Code Day');
    expect(resolveInviteMock).toHaveBeenCalled();
    expect(getCurrentTaskMock).toHaveBeenCalled();
  });

  it('shows recording panel for day 4 handoff and docs for day 5', async () => {
    useCandidateSessionMock.mockReturnValue(
      buildState({
        state: {
          ...baseState().state,
          taskState: {
            ...baseState().state.taskState,
            currentTask: {
              id: 3,
              dayIndex: 4,
              type: 'handoff',
              title: 'Handoff',
              description: 'https://record.me',
            },
          },
        },
      }),
    );

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });
    await waitFor(() =>
      expect(
        screen.getByTestId('resource-day-4-recording'),
      ).toBeInTheDocument(),
    );

    useCandidateSessionMock.mockReturnValue(
      buildState({
        state: {
          ...baseState().state,
          taskState: {
            ...baseState().state.taskState,
            currentTask: {
              id: 4,
              dayIndex: 5,
              type: 'documentation',
              title: 'Docs',
              description: 'https://docs.me',
            },
          },
        },
      }),
    );

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });
    await waitFor(() =>
      expect(
        screen.getByTestId('resource-day-5-documentation'),
      ).toBeInTheDocument(),
    );
  });

  it('shows error banner with retry calling fetchCurrentTask skip cache', async () => {
    const setTaskError = jest.fn();
    const clearTaskError = jest.fn();
    getCurrentTaskMock.mockResolvedValue({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 7,
        dayIndex: 1,
        type: 'design',
        title: 'Design',
        description: '',
      },
    });
    useCandidateSessionMock.mockReturnValue(
      buildState({
        state: {
          ...baseState().state,
          taskState: {
            loading: false,
            error: 'boom',
            isComplete: false,
            completedTaskIds: [],
            currentTask: null,
          },
        },
        setTaskError,
        clearTaskError,
      }),
    );

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });
    const retryButtons = await screen.findAllByRole('button', {
      name: /Retry/i,
    });
    fireEvent.click(retryButtons[0]);
    await waitFor(() => expect(getCurrentTaskMock).toHaveBeenCalled());
  });

  it('shows completion message when tasks are complete', async () => {
    useCandidateSessionMock.mockReturnValue(
      buildState({
        state: {
          ...baseState().state,
          taskState: {
            ...baseState().state.taskState,
            isComplete: true,
          },
        },
      }),
    );
    render(<CandidateSessionPage token="inv" />);
    await waitFor(() =>
      expect(screen.getByTestId('state-message')).toHaveTextContent(
        'Simulation complete',
      ),
    );
  });

  it('renders start view and triggers start fetch when not started', async () => {
    useCandidateSessionMock.mockReturnValue(
      buildState({
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
      }),
    );

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    const startBtn = screen.getByRole('button', { name: /Start simulation/i });
    fireEvent.click(startBtn);

    await waitFor(() => expect(getCurrentTaskMock).toHaveBeenCalled());
  });

  it('redirects unauthenticated users to login', async () => {
    useCandidateSessionMock.mockReturnValue(
      buildState({
        state: {
          ...baseState().state,
          authStatus: 'unauthenticated',
        },
      }),
    );

    render(<CandidateSessionPage token="inv" />);
    await waitFor(() => expect(buildLoginHrefMock).toHaveBeenCalled());
    expect(routerMock.replace).toHaveBeenCalled();
  });

  it('navigates to candidate dashboard from start view back button', async () => {
    useCandidateSessionMock.mockReturnValue(
      buildState({
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
      }),
    );

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    const backBtn = screen.getByRole('button', {
      name: /Back to Candidate Dashboard/i,
    });
    fireEvent.click(backBtn);
    expect(routerMock.push).toHaveBeenCalledWith('/candidate/dashboard');
  });

  it('does not re-run init when same token and already in flight', async () => {
    useCandidateSessionMock.mockReturnValue(buildState());
    resolveInviteMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    // Resolve is called once
    expect(resolveInviteMock).toHaveBeenCalledTimes(1);
  });

  it('renders task error banner with retry', async () => {
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

    useCandidateSessionMock.mockReturnValue(
      buildState({
        state: {
          ...baseState().state,
          started: true,
          taskState: {
            loading: false,
            error: 'Task fetch failed',
            isComplete: false,
            completedTaskIds: [],
            currentTask: {
              id: 1,
              dayIndex: 2,
              type: 'code',
              title: 'Code Day',
              description: '',
            },
          },
        },
      }),
    );

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    // Wait for the error banner to appear in running view
    await waitFor(() =>
      expect(screen.getByText('Task fetch failed')).toBeInTheDocument(),
    );

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);
    await waitFor(() =>
      expect(getCurrentTaskMock).toHaveBeenCalledWith(
        99,
        'auth-token',
        expect.objectContaining({ skipCache: true }),
      ),
    );
  });
});
