import React, { forwardRef, useImperativeHandle } from 'react';
import { render, act } from '@testing-library/react';
import { useCurrentTask } from '@/features/candidate/session/hooks/useCurrentTask';

const getCandidateCurrentTaskMock = jest.fn();
const friendlyTaskErrorMock = jest.fn(() => 'friendly-task-error');

jest.mock('@/features/candidate/api', () => ({
  getCandidateCurrentTask: (...args: unknown[]) =>
    getCandidateCurrentTaskMock(...args),
}));

jest.mock('@/features/candidate/session/utils/errorMessages', () => {
  const actual = jest.requireActual(
    '@/features/candidate/session/utils/errorMessages',
  );
  return {
    ...actual,
    friendlyTaskError: (...args: unknown[]) => friendlyTaskErrorMock(...args),
  };
});

type HookReturn = ReturnType<typeof useCurrentTask>;

type HarnessProps = {
  token: string | null;
  candidateSessionId: number | null;
  setTaskLoading: jest.Mock;
  setTaskLoaded: jest.Mock;
  setTaskError: jest.Mock;
  clearTaskError: jest.Mock;
};

const HookHarness = forwardRef<HookReturn, HarnessProps>(
  function HookHarness(props, ref) {
    const hook = useCurrentTask(props);
    useImperativeHandle(ref, () => hook, [hook]);
    return null;
  },
);

describe('useCurrentTask', () => {
  const baseProps = () => ({
    token: 'tok',
    candidateSessionId: 9,
    setTaskLoading: jest.fn(),
    setTaskLoaded: jest.fn(),
    setTaskError: jest.fn(),
    clearTaskError: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips fetch when token or session id missing', async () => {
    const props = baseProps();
    props.token = null;
    const ref = React.createRef<HookReturn>();
    render(<HookHarness ref={ref} {...props} />);

    await act(async () => {
      await ref.current?.fetchCurrentTask();
    });

    expect(getCandidateCurrentTaskMock).not.toHaveBeenCalled();
  });

  it('dedupes in-flight requests', async () => {
    const props = baseProps();
    const ref = React.createRef<HookReturn>();
    let resolveTask: (val: unknown) => void;
    getCandidateCurrentTaskMock.mockReturnValue(
      new Promise((res) => {
        resolveTask = res;
      }) as unknown as Promise<unknown>,
    );

    render(<HookHarness ref={ref} {...props} />);

    await act(async () => {
      void ref.current?.fetchCurrentTask();
      void ref.current?.fetchCurrentTask();
    });

    expect(getCandidateCurrentTaskMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveTask?.({
        isComplete: false,
        completedTaskIds: [1],
        currentTask: {
          id: 1,
          dayIndex: 2,
          type: 'code',
          title: 't',
          description: 'd',
        },
      });
    });
  });

  it('loads task and normalizes response', async () => {
    const props = baseProps();
    const ref = React.createRef<HookReturn>();
    const dto = {
      isComplete: true,
      progress: { completedTaskIds: [3, 4] },
      currentTask: {
        id: 7,
        dayIndex: 3,
        type: 'design',
        title: 'Design',
        description: 'desc',
      },
    };
    getCandidateCurrentTaskMock.mockResolvedValue(dto);

    render(<HookHarness ref={ref} {...props} />);

    await act(async () => {
      await ref.current?.fetchCurrentTask();
    });

    expect(props.clearTaskError).toHaveBeenCalled();
    expect(props.setTaskLoading).toHaveBeenCalled();
    expect(props.setTaskLoaded).toHaveBeenCalledWith({
      isComplete: true,
      completedTaskIds: [3, 4],
      currentTask: {
        id: 7,
        dayIndex: 3,
        type: 'design',
        title: 'Design',
        description: 'desc',
      },
    });
  });

  it('sets friendly error on failure', async () => {
    const props = baseProps();
    const ref = React.createRef<HookReturn>();
    getCandidateCurrentTaskMock.mockRejectedValue({
      status: 410,
      message: 'expired',
    });

    render(<HookHarness ref={ref} {...props} />);

    await act(async () => {
      await ref.current?.fetchCurrentTask();
    });

    expect(friendlyTaskErrorMock).toHaveBeenCalled();
    expect(props.setTaskError).toHaveBeenCalledWith('friendly-task-error');
  });
});
