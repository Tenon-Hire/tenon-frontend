import type { CandidateInvite } from '@/lib/api/candidate';
import { InviteActions } from './InviteActions';
import { InviteBadges } from './InviteBadges';
import { InviteMeta } from './InviteMeta';
import { InviteProgress } from './InviteProgress';
import { InviteWarnings } from './InviteWarnings';

type InviteCardProps = {
  invite: CandidateInvite;
  onContinue: (invite: CandidateInvite) => void;
  fallbackToken: string | null;
};

export function InviteCard({
  invite,
  onContinue,
  fallbackToken,
}: InviteCardProps) {
  const tokenAvailable = invite.token || fallbackToken;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <InviteMeta invite={invite} />
          <InviteBadges invite={invite} />
        </div>
        <InviteActions
          invite={invite}
          fallbackToken={fallbackToken}
          onContinue={onContinue}
        />
      </div>

      <InviteProgress invite={invite} />
      <InviteWarnings
        invite={invite}
        tokenAvailable={Boolean(tokenAvailable)}
      />
    </div>
  );
}
