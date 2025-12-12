import { render, screen } from '@testing-library/react';
import CandidateSimulationContent from './CandidateSimulationContent';

describe('CandidateSimulationContent', () => {
  it('shows the invite token', () => {
    render(<CandidateSimulationContent token="abc-123" />);

    expect(screen.getByText(/Candidate simulation portal/)).toBeInTheDocument();
    expect(screen.getByText('abc-123')).toBeInTheDocument();
  });
});
