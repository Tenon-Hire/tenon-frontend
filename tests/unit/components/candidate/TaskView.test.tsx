import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import TaskView from '@/features/candidate/task/TaskView';
import { loadCodeDraft, saveCodeDraft, clearCodeDraft } from '@/lib/codeDrafts';

jest.mock('@/components/ui/CodeEditor', () => ({
  __esModule: true,
  default: function MockCodeEditor({
    value,
    onChange,
  }: {
    value: string;
    onChange: (val: string) => void;
  }) {
    return (
      <textarea
        data-testid="mock-code-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  },
}));

jest.mock('@/lib/codeDrafts', () => ({
  loadCodeDraft: jest.fn(),
  saveCodeDraft: jest.fn(),
  clearCodeDraft: jest.fn(),
}));

const loadCodeDraftMock = loadCodeDraft as jest.Mock;
const saveCodeDraftMock = saveCodeDraft as jest.Mock;
const clearCodeDraftMock = clearCodeDraft as jest.Mock;

const textTask = {
  id: 5,
  dayIndex: 1,
  type: 'design',
  title: 'Product brief',
  description: 'Describe your plan.',
};

const codeTask = {
  id: 9,
  dayIndex: 2,
  type: 'code',
  title: 'Implement feature',
  description: 'Write the code.',
};

describe('TaskView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads and auto-saves text drafts', async () => {
    jest.useFakeTimers();
    sessionStorage.setItem('simuhire:candidate:textDraft:5', 'Saved draft');

    render(
      <TaskView
        task={textTask}
        candidateSessionId={123}
        submitting={false}
        onSubmit={jest.fn()}
      />,
    );

    const textarea = screen.getByPlaceholderText(
      'Write your response here…',
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Saved draft');

    fireEvent.change(textarea, { target: { value: 'Updated draft' } });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(sessionStorage.getItem('simuhire:candidate:textDraft:5')).toBe(
      'Updated draft',
    );
  });

  it('shows validation error for empty text submissions', async () => {
    const onSubmit = jest.fn();

    render(
      <TaskView
        task={textTask}
        candidateSessionId={123}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /submit & continue/i }),
      );
      await Promise.resolve();
    });

    expect(
      await screen.findByText(/please enter an answer before submitting/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed text, shows progress, and clears draft', async () => {
    sessionStorage.setItem('simuhire:candidate:textDraft:5', '  Needs trim  ');
    const onSubmit = jest.fn().mockResolvedValue({
      submissionId: 1,
      taskId: 5,
      candidateSessionId: 123,
      submittedAt: '2025-01-01T00:00:00Z',
      progress: { completed: 1, total: 5 },
      isComplete: false,
    });

    render(
      <TaskView
        task={textTask}
        candidateSessionId={123}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /submit & continue/i }),
      );
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalledWith({ contentText: 'Needs trim' });

    await act(async () => {
      await onSubmit.mock.results[0].value;
    });

    expect(
      await screen.findByRole('button', { name: /submitted ✓/i }),
    ).toBeDisabled();
    expect(screen.getByText(/Progress: 1\/5/i)).toBeInTheDocument();
    expect(sessionStorage.getItem('simuhire:candidate:textDraft:5')).toBeNull();
  });

  it('loads code drafts and auto-saves new code', async () => {
    jest.useFakeTimers();
    loadCodeDraftMock.mockReturnValue('function saved() {}');
    const onSubmit = jest.fn();

    render(
      <TaskView
        task={codeTask}
        candidateSessionId={789}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    const codeArea = screen.getByTestId(
      'mock-code-editor',
    ) as HTMLTextAreaElement;
    expect(codeArea.value).toBe('function saved() {}');

    fireEvent.change(codeArea, { target: { value: 'const updated = true;' } });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(saveCodeDraftMock).toHaveBeenCalledWith(
      789,
      9,
      'const updated = true;',
    );
  });

  it('shows validation for empty code submissions', async () => {
    loadCodeDraftMock.mockReturnValue('');
    const onSubmit = jest.fn();

    render(
      <TaskView
        task={codeTask}
        candidateSessionId={321}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    const codeArea = screen.getByTestId(
      'mock-code-editor',
    ) as HTMLTextAreaElement;
    fireEvent.change(codeArea, { target: { value: '   ' } });

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /submit & continue/i }),
      );
      await Promise.resolve();
    });

    expect(
      await screen.findByText(/please write some code/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits code payload, shows progress, and clears code draft on success', async () => {
    loadCodeDraftMock.mockReturnValue('const start = true;');
    const onSubmit = jest.fn().mockResolvedValue({
      submissionId: 2,
      taskId: 9,
      candidateSessionId: 555,
      submittedAt: '2025-01-02T00:00:00Z',
      progress: { completed: 2, total: 5 },
      isComplete: false,
    });

    render(
      <TaskView
        task={codeTask}
        candidateSessionId={555}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /submit & continue/i }));

    expect(onSubmit).toHaveBeenCalledWith({ codeBlob: 'const start = true;' });

    await act(async () => {
      await onSubmit.mock.results[0].value;
    });

    expect(
      await screen.findByRole('button', { name: /submitted ✓/i }),
    ).toBeDisabled();
    expect(screen.getByText(/Progress: 2\/5/i)).toBeInTheDocument();
    expect(clearCodeDraftMock).toHaveBeenCalledWith(555, 9);
  });

  it('does not submit when already submitting', () => {
    const onSubmit = jest.fn();
    render(
      <TaskView
        task={codeTask}
        candidateSessionId={555}
        submitting={true}
        onSubmit={onSubmit}
      />,
    );

    const submittingBtn = screen.getByRole('button', { name: /submitting/i });
    expect(submittingBtn).toBeDisabled();
    fireEvent.click(submittingBtn);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('allows manual save draft and clears saved flag after timeout', async () => {
    jest.useFakeTimers();
    sessionStorage.clear();

    render(
      <TaskView
        task={textTask}
        candidateSessionId={123}
        submitting={false}
        onSubmit={jest.fn()}
      />,
    );

    const textarea = screen.getByPlaceholderText(
      'Write your response here…',
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'manual draft' } });

    const saveBtn = screen.getByRole('button', { name: /save draft/i });
    fireEvent.click(saveBtn);

    expect(sessionStorage.getItem('simuhire:candidate:textDraft:5')).toBe(
      'manual draft',
    );
    expect(screen.getByText(/Draft saved/)).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    expect(screen.queryByText(/Draft saved/)).not.toBeInTheDocument();
  });

  it('resets to idle when onSubmit resolves without SubmitResponse', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <TaskView
        task={textTask}
        candidateSessionId={321}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    const textarea = screen.getByPlaceholderText('Write your response here…');
    fireEvent.change(textarea, { target: { value: 'Draft body' } });
    fireEvent.click(screen.getByRole('button', { name: /submit & continue/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalled();
    expect(
      await screen.findByRole('button', { name: /submit & continue/i }),
    ).toBeEnabled();
  });

  it('falls back to submitError prop when provided', () => {
    render(
      <TaskView
        task={textTask}
        candidateSessionId={321}
        submitting={false}
        onSubmit={jest.fn()}
        submitError="Server unavailable"
      />,
    );

    expect(screen.getByText('Server unavailable')).toBeInTheDocument();
  });

  it('handles submit rejection for code tasks and returns to idle', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('boom'));

    render(
      <TaskView
        task={codeTask}
        candidateSessionId={909}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /submit & continue/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /submit & continue/i }),
    ).toBeEnabled();
  });

  it('handles submit rejection for text tasks and surfaces submitError prop', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('fail'));

    render(
      <TaskView
        task={textTask}
        candidateSessionId={123}
        submitting={false}
        onSubmit={onSubmit}
        submitError="Server down"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Write your response here…'), {
      target: { value: 'hello' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit & continue/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalled();
    expect(screen.getByText('Server down')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /submit & continue/i }),
    ).toBeEnabled();
  });

  it('resets to idle when code submit resolves with non-response payload', async () => {
    const onSubmit = jest.fn().mockResolvedValue({ ok: true });

    render(
      <TaskView
        task={codeTask}
        candidateSessionId={123}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /submit & continue/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /submit & continue/i }),
    ).toBeEnabled();
  });

  it('returns to idle after successful text submit timeout', async () => {
    jest.useFakeTimers();
    const onSubmit = jest.fn().mockResolvedValue({
      submissionId: 1,
      taskId: 5,
      candidateSessionId: 123,
      submittedAt: '2025-01-01',
      progress: { completed: 1, total: 5 },
      isComplete: false,
    });

    render(
      <TaskView
        task={textTask}
        candidateSessionId={123}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Write your response here…'), {
      target: { value: 'Filled' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit & continue/i }));
    expect(
      await screen.findByRole('button', { name: /submitted ✓/i }),
    ).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(950);
    });

    expect(
      screen.getByRole('button', { name: /submit & continue/i }),
    ).toBeEnabled();
  });
});
