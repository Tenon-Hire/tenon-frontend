import { render, screen } from '@testing-library/react';
import { TaskStatus } from '@/features/candidate/session/task/components/TaskStatus';

describe('TaskStatus', () => {
  it('renders nothing for idle', () => {
    render(<TaskStatus displayStatus="idle" progress={null} />);
    expect(screen.queryByText(/Submitting/i)).toBeNull();
  });

  it('shows submitting pill', () => {
    render(<TaskStatus displayStatus="submitting" progress={null} />);
    expect(screen.getByText(/Submitting/i)).toBeInTheDocument();
  });

  it('shows submitted pill and progress', () => {
    render(
      <TaskStatus
        displayStatus="submitted"
        progress={{ completed: 3, total: 5 }}
      />,
    );
    expect(screen.getByText(/Submitted/i)).toBeInTheDocument();
    expect(screen.getByText(/Progress: 3\/5/)).toBeInTheDocument();
  });
});
