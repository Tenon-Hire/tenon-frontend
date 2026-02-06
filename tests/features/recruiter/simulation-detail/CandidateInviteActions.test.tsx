import { render, screen, fireEvent } from '@testing-library/react';
import { CandidateInviteActions } from '@/features/recruiter/simulation-detail/components/CandidateInviteActions';

const candidate = {
  candidateSessionId: 1,
  inviteEmail: 'test@example.com',
  candidateName: 'Test User',
  status: 'not_started',
  startedAt: null,
  completedAt: null,
  hasReport: false,
} as const;

const baseRowState = {
  resending: false,
  copied: false,
  cooldownUntilMs: null,
  manualCopyOpen: false,
  manualCopyUrl: null,
  error: null,
  message: null,
};

describe('CandidateInviteActions', () => {
  it('disables resend during cooldown', () => {
    const onResend = jest.fn();
    render(
      <CandidateInviteActions
        candidate={candidate}
        rowState={{ ...baseRowState, cooldownUntilMs: Date.now() + 5000 }}
        inviteLink="http://x"
        cooldownNow={Date.now()}
        onCopy={() => {}}
        onResend={onResend}
        onCloseManual={() => {}}
      />,
    );

    const resend = screen.getByRole('button', { name: /resend invite/i });
    fireEvent.click(resend);
    expect(onResend).not.toHaveBeenCalled();
  });
});
