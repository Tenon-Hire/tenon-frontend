/**
 * Additional tests for useTaskSubmission to close coverage gaps
 */
import React, { forwardRef, useImperativeHandle } from 'react';
import { render, act } from '@testing-library/react';
import { useTaskSubmission } from '@/features/candidate/session/hooks/useTaskSubmission';

const submitCandidateTaskMock = jest.fn();
const notifyMock = jest.fn();
const normalizeApiErrorMock = jest.fn((err, fallback) => ({
  message: fallback ?? String(err),
}));

jest.mock('@/lib/api/candidate', () => ({
  HttpError: class HttpError extends Error {
    status?: number;
    constructor(status?: number) {
      super('http');
      this.status = status;
    }
  },
  submitCandidateTask: (...args: unknown[]) => submitCandidateTaskMock(...args),
}));

jest.mock('@/features/shared/notifications', () => ({
  useNotifications: () => ({ notify: notifyMock }),
}));

jest.mock('@/lib/utils/errors', () => ({
  __esModule: true,
  normalizeApiError: (...args: unknown[]) => normalizeApiErrorMock(...args),
}));

type HookReturn = ReturnType<typeof useTaskSubmission>;

type HarnessProps = {
  token: string | null;
  candidateSessionId: number | null;
  currentTask: {
    id: number;
    dayIndex: number;
    type: string;
    title: string;
    description: string;
  } | null;
  clearTaskError: jest.Mock;
  setTaskError: jest.Mock;
  refreshTask: jest.Mock;
};

const HookHarness = forwardRef<HookReturn, HarnessProps>(
  function HookHarness(props, ref) {
    const hook = useTaskSubmission(props);
    useImperativeHandle(ref, () => hook, [hook]);
    return null;
  },
);

describe('useTaskSubmission extra coverage', () => {
  const baseProps = () => ({
    token: 'tok',
    candidateSessionId: 11,
    currentTask: {
      id: 1,
      dayIndex: 1,
      type: 'design',
      title: 'Design',
      description: '',
    },
    clearTaskError: jest.fn(),
    setTaskError: jest.fn(),
    refreshTask: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    normalizeApiErrorMock.mockImplementation((err, fallback) => ({
      message: (fallback as string) ?? String(err),
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns early when candidateSessionId is null', async () => {
    const props = baseProps();
    props.candidateSessionId = null;
    const ref = React.createRef<HookReturn>();
    render(<HookHarness ref={ref} {...props} />);

    await act(async () => {
      await ref.current?.handleSubmit({ contentText: 'hi' });
    });

    expect(submitCandidateTaskMock).not.toHaveBeenCalled();
  });

  it('returns early when currentTask is null', async () => {
    const props = baseProps();
    props.currentTask = null;
    const ref = React.createRef<HookReturn>();
    render(<HookHarness ref={ref} {...props} />);

    await act(async () => {
      await ref.current?.handleSubmit({ contentText: 'hi' });
    });

    expect(submitCandidateTaskMock).not.toHaveBeenCalled();
  });

  it('submits GitHub-native day 2 task without text validation', async () => {
    const props = baseProps();
    props.currentTask = {
      id: 2,
      dayIndex: 2,
      type: 'design', // Not a code task, but day 2 is GitHub-native
      title: 'Day2',
      description: '',
    };
    const ref = React.createRef<HookReturn>();
    submitCandidateTaskMock.mockResolvedValue({ ok: true });

    render(<HookHarness ref={ref} {...props} />);

    await act(async () => {
      await ref.current?.handleSubmit({ contentText: '' });
    });

    expect(submitCandidateTaskMock).toHaveBeenCalledWith({
      taskId: 2,
      token: 'tok',
      candidateSessionId: 11,
      contentText: undefined, // GitHub-native doesn't include text
    });
  });

  it('submits GitHub-native day 3 task without text validation', async () => {
    const props = baseProps();
    props.currentTask = {
      id: 3,
      dayIndex: 3,
      type: 'design',
      title: 'Day3',
      description: '',
    };
    const ref = React.createRef<HookReturn>();
    submitCandidateTaskMock.mockResolvedValue({ ok: true });

    render(<HookHarness ref={ref} {...props} />);

    await act(async () => {
      await ref.current?.handleSubmit({});
    });

    expect(submitCandidateTaskMock).toHaveBeenCalled();
  });

  it('clears previous timer before setting new one on successive submits', async () => {
    const props = baseProps();
    props.currentTask = {
      id: 4,
      dayIndex: 2,
      type: 'code',
      title: 'Code',
      description: '',
    };
    const ref = React.createRef<HookReturn>();
    submitCandidateTaskMock.mockResolvedValue({ ok: true });
    const clearSpy = jest.spyOn(window, 'clearTimeout');

    render(<HookHarness ref={ref} {...props} />);

    // First submit
    await act(async () => {
      await ref.current?.handleSubmit({});
    });

    // Second submit should clear the first timer
    await act(async () => {
      await ref.current?.handleSubmit({});
    });

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('submits non-GitHub text task with content', async () => {
    const props = baseProps();
    props.currentTask = {
      id: 5,
      dayIndex: 1,
      type: 'text',
      title: 'Text',
      description: '',
    };
    const ref = React.createRef<HookReturn>();
    submitCandidateTaskMock.mockResolvedValue({ ok: true });

    render(<HookHarness ref={ref} {...props} />);

    await act(async () => {
      await ref.current?.handleSubmit({ contentText: 'My answer' });
    });

    expect(submitCandidateTaskMock).toHaveBeenCalledWith({
      taskId: 5,
      token: 'tok',
      candidateSessionId: 11,
      contentText: 'My answer',
    });
  });

  it('does not clear timer if no timer was set', async () => {
    const props = baseProps();
    const ref = React.createRef<HookReturn>();
    const clearSpy = jest.spyOn(window, 'clearTimeout');

    const { unmount } = render(<HookHarness ref={ref} {...props} />);

    // Unmount without ever submitting
    unmount();

    // clearTimeout should not have been called since no timer was set
    expect(clearSpy).not.toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('handles debug task type as code', async () => {
    const props = baseProps();
    props.currentTask = {
      id: 6,
      dayIndex: 4,
      type: 'debug',
      title: 'Debug',
      description: '',
    };
    const ref = React.createRef<HookReturn>();
    submitCandidateTaskMock.mockResolvedValue({ ok: true });

    render(<HookHarness ref={ref} {...props} />);

    await act(async () => {
      await ref.current?.handleSubmit({});
    });

    expect(submitCandidateTaskMock).toHaveBeenCalledWith({
      taskId: 6,
      token: 'tok',
      candidateSessionId: 11,
      contentText: undefined,
    });
  });

  it('requires text content for day 1 design task', async () => {
    const props = baseProps();
    props.currentTask = {
      id: 7,
      dayIndex: 1,
      type: 'design',
      title: 'Design',
      description: '',
    };
    const ref = React.createRef<HookReturn>();

    render(<HookHarness ref={ref} {...props} />);

    await act(async () => {
      await ref.current?.handleSubmit({ contentText: '' });
    });

    expect(props.setTaskError).toHaveBeenCalledWith(
      'Please enter an answer before submitting.',
    );
    expect(submitCandidateTaskMock).not.toHaveBeenCalled();
  });

  it('handles contentText as undefined for text validation', async () => {
    const props = baseProps();
    props.currentTask = {
      id: 8,
      dayIndex: 1,
      type: 'design',
      title: 'Design',
      description: '',
    };
    const ref = React.createRef<HookReturn>();

    render(<HookHarness ref={ref} {...props} />);

    await act(async () => {
      await ref.current?.handleSubmit({});
    });

    expect(props.setTaskError).toHaveBeenCalledWith(
      'Please enter an answer before submitting.',
    );
  });
});
