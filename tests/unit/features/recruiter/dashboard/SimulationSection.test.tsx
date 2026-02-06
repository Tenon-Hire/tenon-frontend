import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimulationSection } from '@/features/recruiter/dashboard/components/SimulationSection';

type Simulation = { id: string; title: string; status: string };

jest.mock(
  '@/features/recruiter/simulations/list/RecruiterSimulationList',
  () => ({
    RecruiterSimulationList: ({
      simulations,
      onInvite,
    }: {
      simulations: Simulation[];
      onInvite: (sim: Simulation) => void;
    }) => (
      <div data-testid="sim-list" onClick={() => onInvite(simulations[0])}>
        list-{simulations.length}
      </div>
    ),
  }),
);

const sample: Simulation[] = [{ id: '1', title: 'Sim 1', status: 'Draft' }];

describe('SimulationSection', () => {
  it('renders loading skeleton when loading with no data', () => {
    const { container } = render(
      <SimulationSection
        simulations={[]}
        loading
        error={null}
        onInvite={jest.fn()}
      />,
    );
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows error with retry', () => {
    const onRetry = jest.fn();
    render(
      <SimulationSection
        simulations={[]}
        loading={false}
        error="boom"
        onInvite={jest.fn()}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows list when simulations present and handles invite click', () => {
    const onInvite = jest.fn();
    render(
      <SimulationSection
        simulations={sample}
        loading={false}
        error={null}
        onInvite={onInvite}
      />,
    );
    fireEvent.click(screen.getByTestId('sim-list'));
    expect(onInvite).toHaveBeenCalledWith(sample[0]);
    expect(screen.queryByText(/Refreshing/i)).not.toBeInTheDocument();
  });

  it('shows empty list placeholder when no sims and no error', () => {
    const { container } = render(
      <SimulationSection
        simulations={[]}
        loading={false}
        error={null}
        onInvite={jest.fn()}
      />,
    );
    expect(container.querySelector('[data-testid=\"sim-list\"]')).toBeTruthy();
  });

  it('shows refreshing label when loading with existing sims', () => {
    render(
      <SimulationSection
        simulations={sample}
        loading
        error={null}
        onInvite={jest.fn()}
      />,
    );
    expect(screen.getByText(/Refreshing/)).toBeInTheDocument();
  });

  it('omits retry button when onRetry is undefined', () => {
    render(
      <SimulationSection
        simulations={[]}
        loading={false}
        error="boom"
        onInvite={jest.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /Retry/i })).toBeNull();
  });
});
