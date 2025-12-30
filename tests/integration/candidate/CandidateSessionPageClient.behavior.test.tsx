import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CandidateSessionPage from '@/features/candidate/session/CandidateSessionPage';
import { jsonResponse } from '../../setup/responseHelpers';
import { renderCandidateWithProviders } from '../../setup';

jest.mock('@/components/ui/CodeEditor', () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <textarea
      data-testid="code-editor"
      aria-label="Code editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

const fetchMock = jest.fn();
const realFetch = global.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  sessionStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(() => {
  global.fetch = realFetch;
});

describe('CandidateSessionPage (real task view)', () => {
  it('loads bootstrap, walks Day 1 → Day 2 progression, and validates code submissions', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    fetchMock
      .mockImplementationOnce(async () =>
        jsonResponse({
          candidateSessionId: 321,
          status: 'in_progress',
          simulation: { title: 'Infra Simulation', role: 'Backend Engineer' },
        }),
      )
      .mockImplementationOnce(async () =>
        jsonResponse({
          isComplete: false,
          completedTaskIds: [],
          currentTask: {
            id: 101,
            dayIndex: 1,
            type: 'design',
            title: 'Day 1 — Architecture',
            description: 'Describe your plan.',
          },
        }),
      )
      .mockImplementationOnce(async (_input, init) => {
        const body = JSON.parse((init?.body as string) ?? '{}') as {
          contentText?: string;
        };
        return jsonResponse({
          submissionId: 1,
          taskId: 101,
          candidateSessionId: 321,
          submittedAt: '2025-01-01T00:00:00Z',
          progress: { completed: 1, total: 5 },
          isComplete: false,
          received: body.contentText,
        });
      })
      .mockImplementationOnce(async () =>
        jsonResponse({
          isComplete: false,
          completedTaskIds: [101],
          currentTask: {
            id: 202,
            dayIndex: 2,
            type: 'debug',
            title: 'Day 2 — Debug',
            description: 'Fix the failing tests.',
          },
        }),
      );

    renderCandidateWithProviders(<CandidateSessionPage token="valid-token" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(await screen.findByText('Infra Simulation')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /start simulation/i }));

    expect(await screen.findByText('Day 1 — Architecture')).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(/write your response here/i),
      'Day 1 answer',
    );
    await user.click(
      screen.getByRole('button', { name: /submit & continue/i }),
    );

    const submitCall = fetchMock.mock.calls[2];
    expect(submitCall?.[1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse((submitCall?.[1]?.body as string) ?? '{}')).toMatchObject(
      { contentText: 'Day 1 answer' },
    );

    await act(async () => {
      jest.advanceTimersByTime(900);
    });

    expect(await screen.findByText('Day 2 — Debug')).toBeInTheDocument();
    expect(screen.getAllByText(/Completed/i)).toHaveLength(1);
    expect(screen.getByText(/Current/i)).toBeInTheDocument();

    await user.clear(screen.getByTestId('code-editor'));
    await user.type(screen.getByTestId('code-editor'), '   ');
    await user.click(
      screen.getByRole('button', { name: /submit & continue/i }),
    );

    expect(
      await screen.findByText(/Please write some code before submitting/i),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
