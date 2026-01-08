import { render } from '@testing-library/react';
import CandidateDashboardLoading from '@/app/(candidate)/candidate/dashboard/loading';
import CandidateSessionLoading from '@/app/(candidate)/candidate/session/[token]/loading';
import RecruiterDashboardLoading from '@/app/(recruiter)/dashboard/loading';
import RecruiterSimulationLoading from '@/app/(recruiter)/dashboard/simulations/[id]/loading';
import RecruiterSimulationNewLoading from '@/app/(recruiter)/dashboard/simulations/new/loading';

describe('loading components render safely', () => {
  it('renders candidate dashboard loading skeleton', () => {
    const { container } = render(<CandidateDashboardLoading />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders candidate session loading skeleton', () => {
    const { container } = render(<CandidateSessionLoading />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders recruiter dashboard loading skeleton', () => {
    const { container } = render(<RecruiterDashboardLoading />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders recruiter simulation detail loading skeleton', () => {
    const { container } = render(<RecruiterSimulationLoading />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders recruiter simulation new loading skeleton', () => {
    const { container } = render(<RecruiterSimulationNewLoading />);
    expect(container.firstChild).toBeTruthy();
  });
});
