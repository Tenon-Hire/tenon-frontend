import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import TaskView from '@/features/candidate/session/task/CandidateTaskView';
import { BRAND_SLUG } from '@/lib/brand';

const textTask = {
  id: 5,
  dayIndex: 1,
  type: 'design',
  title: 'Product brief',
  description: 'Describe your plan.',
};

const githubNativeTask = {
  id: 11,
  dayIndex: 2,
  type: 'code',
  title: 'Implement feature',
  description: 'Write the code in GitHub.',
};

const githubNativeDay3Task = {
  id: 12,
  dayIndex: 3,
  type: 'code',
  title: 'Implement feature',
  description: 'Write the code in GitHub.',
};

const miscTask = {
  id: 13,
  dayIndex: 1,
  type: 'misc',
  title: 'Other task',
  description: 'Do the thing.',
};

describe('TaskView', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads and auto-saves text drafts', async () => {
    jest.useFakeTimers();
    sessionStorage.setItem(
      `${BRAND_SLUG}:candidate:textDraft:5`,
      'Saved draft',
    );

    render(
      <TaskView task={textTask} submitting={false} onSubmit={jest.fn()} />,
    );

    const textarea = screen.getByPlaceholderText(
      'Write your response here…',
    ) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Saved draft');

    fireEvent.change(textarea, { target: { value: 'Updated draft' } });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(sessionStorage.getItem(`${BRAND_SLUG}:candidate:textDraft:5`)).toBe(
      'Updated draft',
    );
  });

  it('shows validation error for empty text submissions', async () => {
    const onSubmit = jest.fn();

    render(<TaskView task={textTask} submitting={false} onSubmit={onSubmit} />);

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
    sessionStorage.setItem(
      `${BRAND_SLUG}:candidate:textDraft:5`,
      '  Needs trim  ',
    );
    const onSubmit = jest.fn().mockResolvedValue({
      submissionId: 1,
      taskId: 5,
      candidateSessionId: 123,
      submittedAt: '2025-01-01T00:00:00Z',
      progress: { completed: 1, total: 5 },
      isComplete: false,
    });

    render(<TaskView task={textTask} submitting={false} onSubmit={onSubmit} />);

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
    expect(
      sessionStorage.getItem(`${BRAND_SLUG}:candidate:textDraft:5`),
    ).toBeNull();
  });

  it('renders GitHub-native instructions and submits empty payload for Day 2', async () => {
    const onSubmit = jest.fn().mockResolvedValue({ ok: true });

    render(
      <TaskView
        task={githubNativeTask}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByText(/Work in your GitHub repository or Codespace/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /submit & continue/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalledWith({});
  });

  it('renders GitHub-native instructions and submits empty payload for Day 3', async () => {
    const onSubmit = jest.fn().mockResolvedValue({ ok: true });

    render(
      <TaskView
        task={githubNativeDay3Task}
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByText(/Work in your GitHub repository or Codespace/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /submit & continue/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalledWith({});
  });

  it('submits empty payload for non-text, non-github-native tasks', async () => {
    const onSubmit = jest.fn().mockResolvedValue({ ok: true });

    render(<TaskView task={miscTask} submitting={false} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /submit & continue/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalledWith({});
  });

  it('does not submit when already submitting', () => {
    const onSubmit = jest.fn();
    render(<TaskView task={textTask} submitting={true} onSubmit={onSubmit} />);

    const submittingBtn = screen.getByRole('button', { name: /submitting/i });
    expect(submittingBtn).toBeDisabled();
    fireEvent.click(submittingBtn);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('allows manual save draft and clears saved flag after timeout', async () => {
    jest.useFakeTimers();
    sessionStorage.clear();

    render(
      <TaskView task={textTask} submitting={false} onSubmit={jest.fn()} />,
    );

    const textarea = screen.getByPlaceholderText(
      'Write your response here…',
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'manual draft' } });

    const saveBtn = screen.getByRole('button', { name: /save draft/i });
    fireEvent.click(saveBtn);

    expect(sessionStorage.getItem(`${BRAND_SLUG}:candidate:textDraft:5`)).toBe(
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
    render(<TaskView task={textTask} submitting={false} onSubmit={onSubmit} />);

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
        submitting={false}
        onSubmit={jest.fn()}
        submitError="Server unavailable"
      />,
    );

    expect(screen.getByText('Server unavailable')).toBeInTheDocument();
  });

  it('handles submit rejection for text tasks and surfaces submitError prop', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('fail'));

    render(
      <TaskView
        task={textTask}
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

    render(<TaskView task={textTask} submitting={false} onSubmit={onSubmit} />);

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
