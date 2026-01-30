import React from 'react';
import { render, screen } from '@testing-library/react';
import CandidateTaskProgress from '@/features/candidate/session/task/CandidateTaskProgress';

describe('CandidateTaskProgress', () => {
  it('marks completed, current, and locked days with correct labels', () => {
    render(
      <CandidateTaskProgress
        completedCount={2}
        currentDayIndex={3}
        totalDays={5}
        currentTaskTitle="Fix bugs"
      />,
    );

    expect(screen.getByText(/2\/5 complete/)).toBeInTheDocument();
    expect(screen.getByText('Fix bugs')).toBeInTheDocument();
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText(/Complete Day 3 first/)).toBeInTheDocument();
    expect(screen.getAllByText('Done').length).toBeGreaterThan(0);
  });

  it('handles empty current title and custom total days', () => {
    render(
      <CandidateTaskProgress
        completedCount={0}
        currentDayIndex={1}
        totalDays={3}
        currentTaskTitle={null}
      />,
    );
    expect(screen.getByText(/3-day timeline/)).toBeInTheDocument();
    expect(screen.getAllByText('Locked').length).toBeGreaterThan(0);
    expect(screen.getByText(/Complete Day 1 first/)).toBeInTheDocument();
  });

  it('marks all days completed and uses summary titles', () => {
    render(
      <CandidateTaskProgress
        completedCount={5}
        currentDayIndex={5}
        totalDays={5}
        currentTaskTitle="Done"
      />,
    );
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText(/5\/5 complete/)).toBeInTheDocument();
  });
});
