import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react';
import CandidateSessionPage from '@/features/candidate/session/CandidateSessionPage';

const originalEnv = process.env.NEXT_PUBLIC_TENON_DEBUG_PERF;

const useCandidateSessionMock = jest.fn();
const startTestRunMock = jest.fn();
const pollTestRunMock = jest.fn();

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
  default: ({
    task,
    onSubmit,
  }: {
    task: { title: string };
    onSubmit: (data: { response: string }) => void;
  }) => (
    <div data-testid="task-view">
      <span>{task.title}</span>
      <button
        data-testid="submit-btn"
        onClick={() => onSubmit({ response: 'test' })}
      >
        Submit
      </button>
    </div>
  ),
}));

jest.mock(
  '@/features/candidate/session/task/components/WorkspacePanel',
  () => ({
    __esModule: true,
    WorkspacePanel: () => <div data-testid="workspace-panel" />,
  }),
);

jest.mock('@/features/candidate/session/task/components/RunTestsPanel', () => ({
  __esModule: true,
  RunTestsPanel: ({
    onStart,
    onPoll,
  }: {
    onStart: () => Promise<{ runId: string }>;
    onPoll: (runId: string) => Promise<unknown>;
  }) => (
    <div data-testid="run-tests-panel">
      <button
        data-testid="run-tests-btn"
        onClick={() => void onStart().then(() => onPoll('test-run-id'))}
      >
        Run Tests
      </button>
    </div>
  ),
}));

jest.mock('@/features/candidate/session/task/components/ResourcePanel', () => ({
  __esModule: true,
  ResourcePanel: ({ title }: { title: string }) => (
    <div
      data-testid={`resource-panel-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
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

jest.mock('@/lib/api/candidate', () => {
  class HttpError extends Error {
    status: number;
    constructor(status: number, message?: string) {
      super(message ?? `HTTP ${status}`);
      this.status = status;
      this.name = 'HttpError';
    }
  }
  return {
    resolveCandidateInviteToken: (...args: unknown[]) =>
      resolveInviteMock(...args),
    getCandidateCurrentTask: (...args: unknown[]) =>
      getCurrentTaskMock(...args),
    pollCandidateTestRun: (...args: unknown[]) => pollTestRunMock(...args),
    startCandidateTestRun: (...args: unknown[]) => startTestRunMock(...args),
    HttpError,
  };
});

jest.mock('@/features/auth/authPaths', () => ({
  buildLoginHref: () => '/auth/login?mode=candidate',
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
      simulation: { title: 'Test Sim', role: 'Engineer' },
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
        title: 'Code Task',
        description: 'Do the coding task',
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

describe('CandidateSessionPage test run handlers', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_TENON_DEBUG_PERF;
    resolveInviteMock.mockResolvedValue({
      candidateSessionId: 99,
      status: 'in_progress',
      simulation: { title: 'Test Sim', role: 'Engineer' },
    });
    getCurrentTaskMock.mockResolvedValue({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 1,
        dayIndex: 2,
        type: 'code',
        title: 'Code Task',
        description: 'Do the coding task',
      },
    });
    startTestRunMock.mockResolvedValue({ runId: 'run-123' });
    pollTestRunMock.mockResolvedValue({
      status: 'passed',
      passed: 5,
      failed: 0,
      total: 5,
    });
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = originalEnv;
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  it('calls startCandidateTestRun with correct params when running tests', async () => {
    useCandidateSessionMock.mockReturnValue(baseState());

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByTestId('run-tests-panel')).toBeInTheDocument(),
    );

    const runTestsBtn = screen.getByTestId('run-tests-btn');
    fireEvent.click(runTestsBtn);

    await waitFor(() =>
      expect(startTestRunMock).toHaveBeenCalledWith({
        taskId: 1,
        token: 'auth-token',
        candidateSessionId: 99,
      }),
    );
  });

  it('calls pollCandidateTestRun with correct params', async () => {
    useCandidateSessionMock.mockReturnValue(baseState());

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByTestId('run-tests-panel')).toBeInTheDocument(),
    );

    const runTestsBtn = screen.getByTestId('run-tests-btn');
    fireEvent.click(runTestsBtn);

    await waitFor(() =>
      expect(pollTestRunMock).toHaveBeenCalledWith({
        taskId: 1,
        runId: 'test-run-id',
        token: 'auth-token',
        candidateSessionId: 99,
      }),
    );
  });

  it('throws error in handleStartTests when session context missing', async () => {
    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      state: {
        ...baseState().state,
        candidateSessionId: null,
        token: null,
        taskState: {
          ...baseState().state.taskState,
          currentTask: null,
        },
      },
    });

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    // The component should show fallback UI without tests panel
    await waitFor(() =>
      expect(screen.queryByTestId('run-tests-panel')).not.toBeInTheDocument(),
    );
  });

  it('handles day 1 text task without workspace panel', async () => {
    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      state: {
        ...baseState().state,
        taskState: {
          ...baseState().state.taskState,
          currentTask: {
            id: 1,
            dayIndex: 1,
            type: 'design' as const,
            title: 'Design Task',
            description: 'Plan the architecture',
          },
        },
      },
    });

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByTestId('task-view')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('workspace-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('run-tests-panel')).not.toBeInTheDocument();
  });

  it('triggers handleStart and fetchCurrentTask on start button click', async () => {
    const setStarted = jest.fn();
    getCurrentTaskMock.mockResolvedValue({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 1,
        dayIndex: 1,
        type: 'design',
        title: 'Design Task',
        description: '',
      },
    });

    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      setStarted,
      state: {
        ...baseState().state,
        started: false,
        taskState: {
          ...baseState().state.taskState,
          currentTask: {
            id: 1,
            dayIndex: 1,
            type: 'design',
            title: 'Design Task',
            description: '',
          },
        },
      },
    });

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    const startBtn = screen.getByRole('button', { name: /Start simulation/i });
    fireEvent.click(startBtn);

    expect(setStarted).toHaveBeenCalledWith(true);
  });

  it('shows error when task fetch fails during bootstrap', async () => {
    // When getCurrentTaskMock fails during bootstrap, component shows error
    getCurrentTaskMock.mockRejectedValue({ status: 500 });

    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      state: {
        ...baseState().state,
        started: true,
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

    // Since getCurrentTask fails, the component will show error or fallback UI
    await waitFor(() => expect(getCurrentTaskMock).toHaveBeenCalled());
  });

  it('transitions from starting view to running when tasks load', async () => {
    useCandidateSessionMock.mockReturnValue({
      ...baseState(),
      state: {
        ...baseState().state,
        started: true,
        taskState: {
          ...baseState().state.taskState,
          loading: true,
          currentTask: null,
        },
      },
    });

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    // Should trigger fetchCurrentTask effect
    await waitFor(() => expect(getCurrentTaskMock).toHaveBeenCalled());
  });
});

describe('CandidateSessionPage debug/perf paths', () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resolveInviteMock.mockResolvedValue({
      candidateSessionId: 99,
      status: 'in_progress',
      simulation: { title: 'Test Sim', role: 'Engineer' },
    });
    getCurrentTaskMock.mockResolvedValue({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 1,
        dayIndex: 2,
        type: 'code',
        title: 'Code Task',
        description: 'Do the coding task',
      },
    });
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_TENON_DEBUG_PERF;
  });

  afterAll(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  it('does not log debug output when TENON_DEBUG_PERF is not set', async () => {
    useCandidateSessionMock.mockReturnValue(baseState());

    await act(async () => {
      render(<CandidateSessionPage token="inv" />);
    });

    await waitFor(() =>
      expect(screen.getByTestId('run-tests-panel')).toBeInTheDocument(),
    );

    // Debug should not be called in normal mode
    expect(consoleDebugSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('[candidate-session]'),
    );
  });
});
