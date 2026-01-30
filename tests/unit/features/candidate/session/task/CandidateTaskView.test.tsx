import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CandidateTaskView from '@/features/candidate/session/task/CandidateTaskView';
import { Task } from '@/features/candidate/session/task/types';

const useTaskDraftsMock = jest.fn();
const useSubmitHandlerMock = jest.fn();

jest.mock('@/features/candidate/session/task/hooks/taskHooks', () => {
  const actual = jest.requireActual(
    '@/features/candidate/session/task/hooks/taskHooks',
  );
  return {
    ...actual,
    useTaskDrafts: (...args: unknown[]) => useTaskDraftsMock(...args),
    useSubmitHandler: (...args: unknown[]) => useSubmitHandlerMock(...args),
  };
});

jest.mock(
  '@/features/candidate/session/task/components/TaskDescription',
  () => ({
    TaskDescription: ({ description }: { description: string }) => (
      <div data-testid="desc">{description}</div>
    ),
  }),
);

jest.mock('@/features/candidate/session/task/components/TaskHeader', () => ({
  TaskHeader: ({ task }: { task: { title: string } }) => (
    <div data-testid="header">{task.title}</div>
  ),
}));

jest.mock('@/features/candidate/session/task/components/TaskStatus', () => ({
  TaskStatus: ({ displayStatus }: { displayStatus: string }) => (
    <div data-testid="status">{displayStatus}</div>
  ),
}));

jest.mock(
  '@/features/candidate/session/task/components/TaskErrorBanner',
  () => ({
    TaskErrorBanner: ({ message }: { message: string | null }) => (
      <div data-testid="error">{message}</div>
    ),
  }),
);

jest.mock('@/features/candidate/session/task/components/TaskActions', () => ({
  TaskActions: ({
    onSaveDraft,
    onSubmit,
  }: {
    onSaveDraft?: () => void;
    onSubmit: () => void;
  }) => (
    <div>
      {onSaveDraft && <button onClick={onSaveDraft}>save</button>}
      <button onClick={onSubmit}>submit</button>
    </div>
  ),
}));

jest.mock('@/features/candidate/session/task/components/TaskTextInput', () => ({
  TaskTextInput: ({
    onChange,
    value,
  }: {
    onChange: (v: string) => void;
    value: string;
  }) => (
    <textarea
      data-testid="text-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

const baseTask: Task = {
  id: 1,
  dayIndex: 1,
  type: 'write',
  title: 'Write task',
  description: 'desc',
};

describe('CandidateTaskView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders github native task and clears drafts after submit', async () => {
    useTaskDraftsMock.mockReturnValue({
      text: '',
      textTask: false,
      setText: jest.fn(),
      savedAt: null,
      saveDraftNow: jest.fn(),
      clearDrafts: jest.fn(),
    });
    const clearDrafts = useTaskDraftsMock().clearDrafts as jest.Mock;
    useSubmitHandlerMock.mockReturnValue({
      submitStatus: 'idle',
      lastProgress: null,
      handleSubmit: jest.fn().mockResolvedValue('ok'),
    });

    render(
      <CandidateTaskView
        task={{ ...baseTask, dayIndex: 2, type: 'code' }}
        submitting={false}
        onSubmit={jest.fn()}
        submitError={null}
      />,
    );

    await userEvent.click(screen.getByText('submit'));
    await act(async () => Promise.resolve());
    expect(useSubmitHandlerMock().handleSubmit).toHaveBeenCalledWith({});
    expect(clearDrafts).toHaveBeenCalled();
  });

  it('requires text for text tasks and shows local error', async () => {
    const setText = jest.fn();
    useTaskDraftsMock.mockReturnValue({
      text: '   ',
      textTask: true,
      setText,
      savedAt: null,
      saveDraftNow: jest.fn(),
      clearDrafts: jest.fn(),
    });
    useSubmitHandlerMock.mockReturnValue({
      submitStatus: 'idle',
      lastProgress: null,
      handleSubmit: jest.fn().mockResolvedValue('ok'),
    });

    render(
      <CandidateTaskView
        task={baseTask}
        submitting={false}
        onSubmit={jest.fn()}
        submitError={null}
      />,
    );

    await userEvent.click(screen.getByText('submit'));
    expect(screen.getByTestId('error')).toHaveTextContent('Please enter');
  });

  it('submits trimmed text and respects submitting status', async () => {
    const handleSubmit = jest.fn().mockResolvedValue({ status: 'success' });
    const clearDrafts = jest.fn();
    useTaskDraftsMock.mockReturnValue({
      text: ' content ',
      textTask: true,
      setText: jest.fn(),
      savedAt: null,
      saveDraftNow: jest.fn(),
      clearDrafts,
    });
    useSubmitHandlerMock.mockReturnValue({
      submitStatus: 'idle',
      lastProgress: null,
      handleSubmit,
    });

    render(
      <CandidateTaskView
        task={baseTask}
        submitting={false}
        onSubmit={jest.fn()}
        submitError={null}
      />,
    );

    await userEvent.click(screen.getByText('submit'));
    await act(async () => Promise.resolve());
    expect(handleSubmit).toHaveBeenCalledWith({ contentText: 'content' });
    expect(clearDrafts).toHaveBeenCalled();
  });

  it('does not submit when displayStatus not idle', async () => {
    useTaskDraftsMock.mockReturnValue({
      text: 'a',
      textTask: true,
      setText: jest.fn(),
      savedAt: null,
      saveDraftNow: jest.fn(),
      clearDrafts: jest.fn(),
    });
    useSubmitHandlerMock.mockReturnValue({
      submitStatus: 'submitted',
      lastProgress: null,
      handleSubmit: jest.fn(),
    });

    render(
      <CandidateTaskView
        task={baseTask}
        submitting={false}
        onSubmit={jest.fn()}
        submitError="err"
      />,
    );

    await userEvent.click(screen.getByText('submit'));
    expect(useSubmitHandlerMock().handleSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('error')).toHaveTextContent('err');
  });
});
