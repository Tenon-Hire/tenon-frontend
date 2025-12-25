import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import CandidateSimulationContent from '@/app/(public)/(candidate)/candidate/[token]/CandidateSimulationContent';
import { CandidateSessionProvider } from '@/app/(public)/(candidate)/candidate/CandidateSessionProvider';
import {
  HttpError,
  resolveCandidateInviteToken,
  getCandidateCurrentTask,
  submitCandidateTask,
} from '@/lib/candidateApi';

jest.mock('@/lib/candidateApi', () => {
  const actual = jest.requireActual('@/lib/candidateApi');
  return {
    __esModule: true,
    ...actual,
    resolveCandidateInviteToken: jest.fn(),
    getCandidateCurrentTask: jest.fn(),
    submitCandidateTask: jest.fn(),
  };
});

type MockTask = {
  id: number;
  dayIndex: number;
  type: string;
  title: string;
  description: string;
};
type MockTaskViewProps = {
  task: MockTask;
  candidateSessionId: number;
  submitting: boolean;
  submitError?: string | null;
  onSubmit: (payload: {
    contentText?: string;
    codeBlob?: string;
  }) => unknown | Promise<unknown>;
};

function isSubmitResp(
  x: unknown,
): x is { progress: { completed: number; total: number } } {
  if (typeof x !== 'object' || x === null) return false;
  const rec = x as Record<string, unknown>;
  const progress = rec['progress'];
  if (typeof progress !== 'object' || progress === null) return false;
  const p = progress as Record<string, unknown>;
  return typeof p['completed'] === 'number' && typeof p['total'] === 'number';
}

jest.mock('@/features/candidate/task/TaskView', () => ({
  __esModule: true,
  default: function MockTaskView({
    task,
    submitting,
    onSubmit,
  }: MockTaskViewProps) {
    const [statusLine, setStatusLine] = React.useState<string>('');

    async function doSubmit(payload: {
      contentText?: string;
      codeBlob?: string;
    }) {
      setStatusLine('');
      try {
        const resp = await onSubmit(payload);
        if (isSubmitResp(resp)) {
          setStatusLine(
            `Submitted ✓ Progress: ${resp.progress.completed}/${resp.progress.total}`,
          );
        } else if (resp) {
          setStatusLine('Submitted ✓');
        }
      } catch {}
    }

    return (
      <div>
        <div data-testid="mock-task-title">{task.title}</div>

        {statusLine ? (
          <div data-testid="submit-status">{statusLine}</div>
        ) : null}

        <button
          type="button"
          disabled={submitting}
          onClick={() =>
            void doSubmit(
              task.type === 'code' || task.type === 'debug'
                ? { codeBlob: '//' }
                : { contentText: 'ok' },
            )
          }
        >
          Submit & Continue
        </button>

        <button
          type="button"
          disabled={submitting}
          onClick={() => void doSubmit({ contentText: '   ' })}
        >
          Submit empty
        </button>

        <button
          type="button"
          disabled={submitting}
          onClick={() => void doSubmit({ codeBlob: '   ' })}
        >
          Submit empty code
        </button>
      </div>
    );
  },
}));

const resolveMock = resolveCandidateInviteToken as unknown as jest.Mock;
const currentTaskMock = getCandidateCurrentTask as unknown as jest.Mock;
const submitMock = submitCandidateTask as unknown as jest.Mock;

function renderWithProvider(ui: React.ReactNode) {
  return render(<CandidateSessionProvider>{ui}</CandidateSessionProvider>);
}

const STORAGE_KEY = 'simuhire:candidate_session_v1';

function seedSessionStorage(value: unknown) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

describe('CandidateSimulationContent', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('valid token loads intro screen with correct title/role and start button, then loads current task', async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: 'in_progress',
      simulation: {
        title: 'Backend Engineer Simulation',
        role: 'Backend Engineer',
      },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 101,
        dayIndex: 1,
        type: 'design',
        title: 'Day 1 — Architecture',
        description: 'Describe your approach.',
      },
    });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    expect(
      await screen.findByText('Backend Engineer Simulation'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Role:\s*Backend Engineer/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /start simulation/i }));

    expect(await screen.findByText('Day 1 — Architecture')).toBeInTheDocument();
  });

  it('invalid token shows friendly error and no task UI', async () => {
    resolveMock.mockRejectedValueOnce(new HttpError(404, 'Not found'));

    renderWithProvider(<CandidateSimulationContent token="INVALID_TOKEN" />);

    expect(
      await screen.findByText(/Unable to load simulation/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/invite link is invalid/i)).toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: /start simulation/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('expired token shows expired message', async () => {
    resolveMock.mockRejectedValueOnce(new HttpError(410, 'Expired'));

    renderWithProvider(<CandidateSimulationContent token="EXPIRED" />);

    expect(
      await screen.findByText(/invite link has expired/i),
    ).toBeInTheDocument();
  });

  it('network errors show retry and retry succeeds', async () => {
    resolveMock
      .mockRejectedValueOnce(
        new HttpError(
          0,
          'Network error. Please check your connection and try again.',
        ),
      )
      .mockResolvedValueOnce({
        candidateSessionId: 999,
        status: 'in_progress',
        simulation: { title: 'Sim', role: 'Backend Engineer' },
      });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    expect(
      await screen.findByText(/Unable to load simulation/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Network error/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('Sim')).toBeInTheDocument();
    expect(screen.getByText(/Role:\s*Backend Engineer/i)).toBeInTheDocument();
  });

  it('shows server error message when bootstrap fails with message field', async () => {
    resolveMock.mockRejectedValueOnce({
      status: 500,
      message: 'Backend exploded',
    });

    renderWithProvider(<CandidateSimulationContent token="SERVER_FAIL" />);

    expect(
      await screen.findByText(/Unable to load simulation/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Backend exploded')).toBeInTheDocument();
  });

  it('falls back to default bootstrap error when backend gives no message', async () => {
    resolveMock.mockRejectedValueOnce({ status: 500 });

    renderWithProvider(<CandidateSimulationContent token="SERVER_FAIL" />);

    expect(
      await screen.findByText(/Unable to load simulation/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Something went wrong loading your simulation/i),
    ).toBeInTheDocument();
  });

  it('submitting a design/documentation task uses contentText payload', async () => {
    jest.useFakeTimers();

    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock
      .mockResolvedValueOnce({
        isComplete: false,
        completedTaskIds: [],
        currentTask: {
          id: 101,
          dayIndex: 1,
          type: 'design',
          title: 'Unique Day 1 Title',
          description: 'Design it.',
        },
      })
      .mockResolvedValueOnce({
        isComplete: false,
        completedTaskIds: [101],
        currentTask: {
          id: 102,
          dayIndex: 2,
          type: 'code',
          title: 'Unique Day 2 Title',
          description: 'Implement it.',
        },
      });

    submitMock.mockResolvedValueOnce({
      submissionId: 1,
      taskId: 101,
      candidateSessionId: 123,
      submittedAt: '2025-12-16T00:00:00Z',
      progress: { completed: 1, total: 5 },
      isComplete: false,
    });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /start simulation/i }),
    );
    expect(await screen.findByText('Unique Day 1 Title')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /submit & continue/i }));

    expect(submitMock).toHaveBeenCalledTimes(1);
    const arg = submitMock.mock.calls[0]?.[0];

    expect(arg).toMatchObject({
      taskId: 101,
      token: 'VALID_TOKEN',
      candidateSessionId: 123,
      contentText: 'ok',
    });

    expect(await screen.findByTestId('submit-status')).toHaveTextContent(
      'Progress: 1/5',
    );

    await advance(900);

    expect(await screen.findByText('Unique Day 2 Title')).toBeInTheDocument();
  });

  it('empty text submission shows validation error and does not call submit endpoint', async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 101,
        dayIndex: 1,
        type: 'design',
        title: 'Unique Day 1 Title',
        description: 'Design it.',
      },
    });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /start simulation/i }),
    );
    expect(await screen.findByText('Unique Day 1 Title')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^submit empty$/i }));

    expect(submitMock).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/please enter an answer before submitting/i),
    ).toBeInTheDocument();
  });

  it('empty code submission shows validation error and does not call submit endpoint', async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 102,
        dayIndex: 2,
        type: 'code',
        title: 'Unique Day 2 Title',
        description: 'Implement it.',
      },
    });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /start simulation/i }),
    );
    expect(await screen.findByText('Unique Day 2 Title')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /^submit empty code$/i }),
    );

    expect(submitMock).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/please write some code before submitting/i),
    ).toBeInTheDocument();
  });

  it('after submitting Day 1, progress advances to Day 2', async () => {
    jest.useFakeTimers();

    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock
      .mockResolvedValueOnce({
        isComplete: false,
        completedTaskIds: [],
        currentTask: {
          id: 101,
          dayIndex: 1,
          type: 'design',
          title: 'Unique Day 1 Title',
          description: 'Design it.',
        },
      })
      .mockResolvedValueOnce({
        isComplete: false,
        completedTaskIds: [101],
        currentTask: {
          id: 102,
          dayIndex: 2,
          type: 'code',
          title: 'Unique Day 2 Title',
          description: 'Implement it.',
        },
      });

    submitMock.mockResolvedValueOnce({
      submissionId: 1,
      taskId: 101,
      candidateSessionId: 123,
      submittedAt: '2025-12-16T00:00:00Z',
      progress: { completed: 1, total: 5 },
      isComplete: false,
    });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /start simulation/i }),
    );
    expect(await screen.findByText('Unique Day 1 Title')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /submit & continue/i }));

    expect(await screen.findByTestId('submit-status')).toHaveTextContent(
      'Progress: 1/5',
    );

    await advance(900);

    expect(await screen.findByText('Unique Day 2 Title')).toBeInTheDocument();
  });

  it('after completing all 5 tasks, UI shows completion state', async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: true,
      completedTaskIds: [1, 2, 3, 4, 5],
      currentTask: null,
    });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /start simulation/i }),
    );

    expect(await screen.findByText(/Simulation complete/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /submit & continue/i }),
    ).not.toBeInTheDocument();
  });

  it('refresh retains progress (seeded started session loads current task without needing Start)', async () => {
    seedSessionStorage({
      token: 'VALID_TOKEN',
      bootstrap: {
        candidateSessionId: 123,
        status: 'in_progress',
        simulation: { title: 'Sim', role: 'Backend Engineer' },
      },
      started: true,
      taskState: {
        loading: false,
        error: null,
        isComplete: false,
        completedTaskIds: [],
        currentTask: null,
      },
    });

    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: false,
      completedTaskIds: [101, 102],
      currentTask: {
        id: 103,
        dayIndex: 3,
        type: 'debug',
        title: 'Unique Day 3 Title',
        description: 'Debug it.',
      },
    });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    expect(
      screen.queryByRole('button', { name: /start simulation/i }),
    ).not.toBeInTheDocument();
    expect(await screen.findByText('Unique Day 3 Title')).toBeInTheDocument();
    expect(currentTaskMock).toHaveBeenCalled();
  });

  it('shows friendly task load error when current task fetch fails', async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 777,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock.mockRejectedValueOnce(
      new HttpError(404, 'Session missing'),
    );

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /start simulation/i }),
    );

    expect(
      await screen.findByText(
        /Session not found\. Please reopen your invite link\./i,
      ),
    ).toBeInTheDocument();
  });

  it('shows network-friendly task error when fetch fails with status 0', async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 888,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock.mockRejectedValueOnce({ status: 0, message: 'offline' });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /start simulation/i }),
    );

    expect(
      await screen.findByText(
        /Network error\. Please check your connection and try again\./i,
      ),
    ).toBeInTheDocument();
  });

  it('displays submit error returned from backend (409)', async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 202,
        dayIndex: 2,
        type: 'code',
        title: 'Day 2 — Code',
        description: 'Write code.',
      },
    });

    submitMock.mockRejectedValueOnce(new HttpError(409, 'Already submitted'));

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /start simulation/i }),
    );
    expect(await screen.findByText('Day 2 — Code')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /submit & continue/i }));

    expect(
      await screen.findByText(/Task already submitted/i),
    ).toBeInTheDocument();
  });

  it('renders submit error for out-of-order submission (400)', async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 222,
        dayIndex: 3,
        type: 'debug',
        title: 'Day 3 — Debug',
        description: 'Fix it.',
      },
    });

    submitMock.mockRejectedValueOnce({ status: 400, message: 'Out of order' });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /start simulation/i }),
    );
    expect(await screen.findByText('Day 3 — Debug')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /submit & continue/i }));

    expect(await screen.findByText(/Task out of order/i)).toBeInTheDocument();
  });

  it('renders submit mismatch error when backend returns 404', async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 123,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 333,
        dayIndex: 4,
        type: 'documentation',
        title: 'Doc Task',
        description: 'Document it.',
      },
    });

    submitMock.mockRejectedValueOnce({
      status: 404,
      message: 'missing session',
    });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /start simulation/i }),
    );
    expect(await screen.findByText('Doc Task')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /submit & continue/i }));

    expect(await screen.findByText(/Session mismatch/i)).toBeInTheDocument();
  });

  it('uses nested progress.completedTaskIds when present', async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 222,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: false,
      progress: { completedTaskIds: [1, 2] },
      currentTask: {
        id: 303,
        dayIndex: 3,
        type: 'debug',
        title: 'Day 3 — Debug',
        description: 'Fix it.',
      },
    });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /start simulation/i }),
    );

    expect(await screen.findByText('Day 3 — Debug')).toBeInTheDocument();
    expect(screen.getAllByText(/Completed/i)).toHaveLength(2);
    expect(screen.getByText(/Current/i)).toBeInTheDocument();
  });

  it('shows backend message when bootstrap fails with generic error', async () => {
    const err = new Error('Backend offline') as Error & { status?: number };
    err.status = 500;
    resolveMock.mockRejectedValueOnce(err);

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    expect(await screen.findByText(/Backend offline/i)).toBeInTheDocument();
  });

  it('recovers from task load error, retries, and clears submit timers', async () => {
    jest.useFakeTimers();

    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 111,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    const codeTask = {
      id: 501,
      dayIndex: 2,
      type: 'code' as const,
      title: 'Debug API',
      description: 'Fix it',
    };

    const designTask = {
      id: 502,
      dayIndex: 3,
      type: 'design' as const,
      title: 'Design follow-up',
      description: 'Describe next steps',
    };

    currentTaskMock
      .mockRejectedValueOnce(new HttpError(410, 'expired'))
      .mockResolvedValueOnce({
        isComplete: false,
        completedTaskIds: [],
        currentTask: codeTask,
      })
      .mockResolvedValueOnce({
        isComplete: false,
        completedTaskIds: [codeTask.id],
        currentTask: designTask,
      });

    submitMock.mockResolvedValue({
      progress: { completed: 2, total: 5 },
      nextTask: designTask,
    });

    const originalClear = window.clearTimeout;
    const clearTimeoutSpy = jest.fn();
    Object.defineProperty(window, 'clearTimeout', { value: clearTimeoutSpy });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    const startBtn = await screen.findByRole('button', {
      name: /start simulation/i,
    });
    fireEvent.click(startBtn);

    expect(
      await screen.findByText(/invite link has expired/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));

    expect(await screen.findByText('Debug API')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', {
      name: /Submit & Continue/i,
    });
    fireEvent.click(submitBtn);

    await screen.findByTestId('submit-status');

    fireEvent.click(submitBtn);

    expect(submitMock).toHaveBeenCalledTimes(2);
    expect(clearTimeoutSpy).toHaveBeenCalled();

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    Object.defineProperty(window, 'clearTimeout', { value: originalClear });
  });

  it('shows default task error when backend fails without message', async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 555,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock.mockRejectedValueOnce({ status: 500 });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /start simulation/i }),
    );

    expect(
      await screen.findByText(
        /Something went wrong loading your current task/i,
      ),
    ).toBeInTheDocument();
  });

  it('shows default submit error when submission fails without message', async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 666,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 909,
        dayIndex: 1,
        type: 'design',
        title: 'Day 1 — Design',
        description: 'Desc',
      },
    });

    submitMock.mockRejectedValueOnce({ status: 500 });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /start simulation/i }),
    );

    const submitBtn = await screen.findByRole('button', {
      name: /Submit & Continue/i,
    });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Something went wrong submitting your task/i),
    ).toBeInTheDocument();
  });

  it('shows completion state when tasks are done', async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 777,
      status: 'completed',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: true,
      completedTaskIds: [1, 2, 3, 4, 5],
      currentTask: null,
    });

    renderWithProvider(<CandidateSimulationContent token="DONE" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /start simulation/i }),
    );

    expect(await screen.findByText(/Simulation complete/)).toBeInTheDocument();
  });

  it('shows submit error when backend rejects submission', async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 888,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: false,
      completedTaskIds: [],
      currentTask: {
        id: 909,
        dayIndex: 1,
        type: 'design',
        title: 'Day 1 — Design',
        description: 'Desc',
      },
    });

    submitMock.mockRejectedValueOnce(new HttpError(400, 'Task out of order.'));

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /start simulation/i }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: /Submit & Continue/i }),
    );

    expect(await screen.findByText(/Task out of order/i)).toBeInTheDocument();
  });

  it('normalizes missing completed task ids to empty array', async () => {
    resolveMock.mockResolvedValueOnce({
      candidateSessionId: 777,
      status: 'in_progress',
      simulation: { title: 'Sim', role: 'Backend Engineer' },
    });

    currentTaskMock.mockResolvedValueOnce({
      isComplete: false,
      currentTask: {
        id: 11,
        dayIndex: 1,
        type: 'design',
        title: 'Day 1 — Start',
        description: 'Start',
      },
    });

    renderWithProvider(<CandidateSimulationContent token="VALID_TOKEN" />);

    fireEvent.click(
      await screen.findByRole('button', { name: /start simulation/i }),
    );

    expect(await screen.findByText('Day 1 — Start')).toBeInTheDocument();
    expect(screen.getAllByText(/Locked/)).toHaveLength(4);
    expect(screen.queryByText(/Completed/)).toBeNull();
  });
});
