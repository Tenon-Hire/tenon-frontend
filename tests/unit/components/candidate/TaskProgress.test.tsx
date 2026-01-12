import { render, screen } from '@testing-library/react';
import TaskProgress from '@/features/candidate/session/task/CandidateTaskProgress';

describe('TaskProgress', () => {
  it('marks completed, current, and locked days correctly', () => {
    render(
      <TaskProgress completedCount={2} currentDayIndex={3} totalDays={5} />,
    );

    expect(screen.getByText('Day 1').closest('li')).toHaveTextContent(
      'Completed',
    );
    expect(screen.getByText('Day 2').closest('li')).toHaveTextContent(
      'Completed',
    );
    expect(screen.getByText('Day 3').closest('li')).toHaveTextContent(
      'In progress',
    );
    expect(screen.getByText('Day 4').closest('li')).toHaveTextContent('Locked');
    expect(screen.getByText('Day 5').closest('li')).toHaveTextContent('Locked');
  });

  it('treats current day as current even if completed count is lower', () => {
    render(
      <TaskProgress completedCount={0} currentDayIndex={2} totalDays={3} />,
    );

    expect(screen.getByText('Day 1').closest('li')).toHaveTextContent('Locked');
    expect(screen.getByText('Day 2').closest('li')).toHaveTextContent(
      'In progress',
    );
    expect(screen.getByText('Day 3').closest('li')).toHaveTextContent('Locked');
  });

  it('uses the current task title for the active day', () => {
    render(
      <TaskProgress
        completedCount={1}
        currentDayIndex={2}
        totalDays={5}
        currentTaskTitle="Build the API"
      />,
    );

    expect(screen.getByText('Build the API')).toBeInTheDocument();
  });
});
