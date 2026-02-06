import { render, screen } from '@testing-library/react';
import { InviteBadges } from '@/features/candidate/dashboard/components/InviteBadges';
import type { CandidateInvite } from '@/lib/api/candidate';

const baseInvite: CandidateInvite = {
  candidateSessionId: 1,
  token: 't',
  title: 'Simulation',
  role: 'Engineer',
  company: 'Tenon',
  status: 'in_progress',
  progress: { completed: 1, total: 5 },
  expiresAt: null,
  lastActivityAt: null,
  isExpired: false,
};

describe('InviteBadges', () => {
  it('renders status pill using statusMeta', () => {
    render(<InviteBadges invite={baseInvite} />);
    expect(screen.getByText(/In progress/i)).toBeInTheDocument();
  });

  it('shows expired pill when invite is expired', () => {
    render(
      <InviteBadges
        invite={{ ...baseInvite, isExpired: true, status: 'expired' }}
      />,
    );
    expect(screen.getByText(/Expired/i)).toBeInTheDocument();
  });
});
