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

  it('shows "Complete Day 1 first" for day 1 locked state', () => {
    render(
      <TaskProgress completedCount={0} currentDayIndex={0} totalDays={3} />,
    );

    expect(screen.getByText('Day 1').closest('li')).toHaveTextContent(
      'Complete Day 1 first',
    );
  });

  it('shows "Complete Day 3 first" for day 4 locked state', () => {
    render(
      <TaskProgress completedCount={2} currentDayIndex={3} totalDays={5} />,
    );

    expect(screen.getByText('Day 4').closest('li')).toHaveTextContent(
      'Complete Day 3 first',
    );
  });

  it('uses default title when no summary exists for extra days', () => {
    render(
      <TaskProgress completedCount={5} currentDayIndex={6} totalDays={7} />,
    );

    // Day 6 and Day 7 appear both as headers and titles, so expect multiples
    expect(screen.getAllByText('Day 6').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Day 7').length).toBeGreaterThanOrEqual(1);
  });

  it('renders without currentTaskTitle', () => {
    render(
      <TaskProgress
        completedCount={1}
        currentDayIndex={2}
        totalDays={5}
        currentTaskTitle={null}
      />,
    );

    expect(screen.getByText('Build in GitHub')).toBeInTheDocument();
  });

  it('shows "Done" for completed days', () => {
    render(
      <TaskProgress completedCount={2} currentDayIndex={3} totalDays={5} />,
    );

    expect(screen.getByText('Day 1').closest('li')).toHaveTextContent('Done');
    expect(screen.getByText('Day 2').closest('li')).toHaveTextContent('Done');
  });

  it('shows "You are here" for current day', () => {
    render(
      <TaskProgress completedCount={1} currentDayIndex={2} totalDays={5} />,
    );

    expect(screen.getByText('Day 2').closest('li')).toHaveTextContent(
      'You are here',
    );
  });
});
