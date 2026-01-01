import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { useTaskSubmission } from '@/features/candidate/session/hooks/useTaskSubmission';
import type { Task } from '@/features/candidate/session/task/types';

jest.mock('@/lib/api/candidate', () => {
  const actual = jest.requireActual('@/lib/api/candidate');
  return {
    __esModule: true,
    ...actual,
    submitCandidateTask: jest.fn(),
  };
});

const submitMock = jest.requireMock('@/lib/api/candidate')
  .submitCandidateTask as jest.Mock;

function Harness({
  token,
  candidateSessionId,
  currentTask,
  setTaskError,
  clearTaskError,
  refreshTask,
  payload = { contentText: 'answer' },
}: {
  token: string | null;
  candidateSessionId: number | null;
  currentTask: Task | null;
  setTaskError: jest.Mock;
  clearTaskError: jest.Mock;
  refreshTask: jest.Mock;
  payload?: { contentText?: string; codeBlob?: string };
}) {
  const { submitting, handleSubmit } = useTaskSubmission({
    token,
    candidateSessionId,
    currentTask,
    clearTaskError,
    setTaskError,
    refreshTask,
  });

  return (
    <div>
      <div data-testid="submitting">{String(submitting)}</div>
      <button onClick={() => void handleSubmit(payload)}>submit</button>
    </div>
  );
}

describe('useTaskSubmission', () => {
  beforeEach(() => {
    submitMock.mockReset();
  });

  it('blocks empty text submissions', async () => {
    const setTaskError = jest.fn();
    const clearTaskError = jest.fn();
    const refreshTask = jest.fn();

    render(
      <Harness
        token="auth"
        candidateSessionId={5}
        currentTask={{
          id: 1,
          dayIndex: 1,
          type: 'documentation',
          title: 'Docs',
          description: '',
        }}
        setTaskError={setTaskError}
        clearTaskError={clearTaskError}
        refreshTask={refreshTask}
        payload={{ contentText: ' ' }}
      />,
    );

    await act(async () => {
      // empty text triggers validation
      screen.getByText('submit').click();
    });

    expect(setTaskError).toHaveBeenCalled();
    expect(submitMock).not.toHaveBeenCalled();
  });

  it('submits and schedules refresh', async () => {
    const setTaskError = jest.fn();
    const clearTaskError = jest.fn();
    const refreshTask = jest.fn();
    submitMock.mockResolvedValue({ ok: true });
    jest.useFakeTimers();

    render(
      <Harness
        token="auth"
        candidateSessionId={5}
        currentTask={{
          id: 1,
          dayIndex: 1,
          type: 'design',
          title: 'Design',
          description: '',
        }}
        setTaskError={setTaskError}
        clearTaskError={clearTaskError}
        refreshTask={refreshTask}
      />,
    );

    await act(async () => {
      screen.getByText('submit').click();
    });

    expect(submitMock).toHaveBeenCalledWith({
      taskId: 1,
      token: 'auth',
      candidateSessionId: 5,
      contentText: 'answer',
      codeBlob: undefined,
    });

    await act(async () => {
      jest.runAllTimers();
    });
    expect(refreshTask).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
