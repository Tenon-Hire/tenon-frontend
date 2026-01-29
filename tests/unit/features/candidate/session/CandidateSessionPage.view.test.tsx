import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
      <div data-testid="workspace-panel">
        {JSON.stringify(props)}
      </div>
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
  getCandidateCurrentTask: (...args: unknown[]) =>
    getCurrentTaskMock(...args),
  pollCandidateTestRun: jest.fn(),
  startCandidateTestRun: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
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

  it('renders running view with workspace and tests for day 2 code task', async () => {
    useCandidateSessionMock.mockReturnValue(buildState());

    render(<CandidateSessionPage token="inv" />);

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

    render(<CandidateSessionPage token="inv" />);
    await waitFor(() =>
      expect(screen.getByTestId('resource-day-4-recording')).toBeInTheDocument(),
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

    render(<CandidateSessionPage token="inv" />);
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

    render(<CandidateSessionPage token="inv" />);
    const retryButtons = await screen.findAllByRole('button', { name: /Retry/i });
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
});
