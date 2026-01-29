import React from 'react';
import { render, screen } from '@testing-library/react';
import { TaskStatus } from '@/features/candidate/session/task/components/TaskStatus';

describe('TaskStatus', () => {
  it('renders submitting state', () => {
    render(<TaskStatus displayStatus="submitting" progress={null} />);
    expect(screen.getByText(/Submitting/)).toBeInTheDocument();
  });

  it('renders submitted with progress', () => {
    render(
      <TaskStatus
        displayStatus="submitted"
        progress={{ completed: 3, total: 5 }}
      />,
    );
    expect(
      screen.getByText(/Progress: 3\/5/, { exact: false }),
    ).toBeInTheDocument();
  });

  it('renders nothing when idle', () => {
    render(<TaskStatus displayStatus="idle" progress={null} />);
    expect(screen.queryByText(/Submitting/i)).toBeNull();
    expect(screen.queryByText(/Submitted/i)).toBeNull();
  });
});
