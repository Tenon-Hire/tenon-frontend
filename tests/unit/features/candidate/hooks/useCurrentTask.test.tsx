import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { useCurrentTask } from '@/features/candidate/session/hooks/useCurrentTask';

jest.mock('@/lib/api/candidate', () => {
  const actual = jest.requireActual('@/lib/api/candidate');
  return {
    __esModule: true,
    ...actual,
    getCandidateCurrentTask: jest.fn(),
  };
});

const getTaskMock = jest.requireMock('@/lib/api/candidate')
  .getCandidateCurrentTask as jest.Mock;

function Harness({
  token,
  candidateSessionId,
  setTaskLoaded,
  setTaskError,
}: {
  token: string | null;
  candidateSessionId: number | null;
  setTaskLoaded: jest.Mock;
  setTaskError: jest.Mock;
}) {
  const { fetchCurrentTask } = useCurrentTask({
    token,
    candidateSessionId,
    setTaskLoading: jest.fn(),
    setTaskLoaded,
    setTaskError,
    clearTaskError: jest.fn(),
  });

  return <button onClick={() => void fetchCurrentTask()}>fetch</button>;
}

describe('useCurrentTask', () => {
  beforeEach(() => {
    getTaskMock.mockReset();
  });

  it('loads current task and normalizes state', async () => {
    const setTaskLoaded = jest.fn();
    const setTaskError = jest.fn();
    getTaskMock.mockResolvedValue({
      isComplete: false,
      completedTaskIds: [1],
      currentTask: {
        id: 7,
        dayIndex: 2,
        type: 'design',
        title: 'Day 2',
        description: 'desc',
      },
    });

    render(
      <Harness
        token="auth"
        candidateSessionId={99}
        setTaskLoaded={setTaskLoaded}
        setTaskError={setTaskError}
      />,
    );

    await act(async () => {
      screen.getByText('fetch').click();
    });

    expect(getTaskMock).toHaveBeenCalledWith(99, 'auth');
    expect(setTaskLoaded).toHaveBeenCalledWith({
      isComplete: false,
      completedTaskIds: [1],
      currentTask: {
        id: 7,
        dayIndex: 2,
        type: 'design',
        title: 'Day 2',
        description: 'desc',
      },
    });
    expect(setTaskError).not.toHaveBeenCalled();
  });

  it('handles errors', async () => {
    const setTaskLoaded = jest.fn();
    const setTaskError = jest.fn();
    getTaskMock.mockRejectedValue(new Error('network'));

    render(
      <Harness
        token="auth"
        candidateSessionId={100}
        setTaskLoaded={setTaskLoaded}
        setTaskError={setTaskError}
      />,
    );

    await act(async () => {
      screen.getByText('fetch').click();
    });

    expect(setTaskLoaded).not.toHaveBeenCalled();
    expect(setTaskError).toHaveBeenCalled();
  });
});
