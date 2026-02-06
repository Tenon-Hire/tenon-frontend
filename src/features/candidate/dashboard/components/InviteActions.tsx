import Button from '@/components/ui/Button';
import type { CandidateInvite } from '@/lib/api/candidate';

type Props = {
  invite: CandidateInvite;
  fallbackToken: string | null;
  onContinue: (invite: CandidateInvite) => void;
};

export function InviteActions({ invite, fallbackToken, onContinue }: Props) {
  const tokenAvailable = invite.token || fallbackToken;
  const disabled = !tokenAvailable || invite.isExpired;
  const label =
    invite.status === 'not_started' ? 'Start simulation' : 'Continue';

  return (
    <Button
      onClick={() => onContinue(invite)}
      disabled={disabled}
      className="w-full sm:w-auto"
    >
      {label}
    </Button>
  );
}
