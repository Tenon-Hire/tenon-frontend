import type { CandidateInvite } from '@/lib/api/candidate';

type Props = {
  invite: CandidateInvite;
  tokenAvailable: boolean;
};

export function InviteWarnings({ invite, tokenAvailable }: Props) {
  if (invite.isExpired) {
    return (
      <div className="mt-3 text-xs text-amber-700">
        This invite has expired. Please contact your recruiter for a new link.
      </div>
    );
  }

  if (!tokenAvailable) {
    return (
      <div className="mt-3 text-xs text-amber-700">
        Invite link unavailable. We’ll keep this saved; please open your most
        recent invite email to resume.
      </div>
    );
  }

  return null;
}
