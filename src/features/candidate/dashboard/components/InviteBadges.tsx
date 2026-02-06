import { StatusPill } from '@/components/ui/StatusPill';
import { formatShortDate } from '@/features/shared/formatters/date';
import { statusMeta } from '@/features/shared/status/statusMeta';
import type { CandidateInvite } from '@/lib/api/candidate';

type Props = { invite: CandidateInvite };

export function InviteBadges({ invite }: Props) {
  const normalizedStatus = invite.status || 'not_started';
  const isExpired = invite.isExpired || normalizedStatus === 'expired';
  const meta = statusMeta(
    isExpired ? 'expired' : normalizedStatus,
    'Not started',
  );
  const statusLabel = meta.label.toLowerCase();
  const statusTone = meta.tone;
  return (
    <div className="flex flex-wrap gap-3 text-xs text-gray-600">
      <StatusPill label={statusLabel} tone={statusTone} />
      {invite.progress?.completed != null && invite.progress?.total ? (
        <span>
          Progress: {invite.progress.completed}/{invite.progress.total}
        </span>
      ) : null}
      {formatShortDate(invite.lastActivityAt) ? (
        <span>Last active: {formatShortDate(invite.lastActivityAt)}</span>
      ) : null}
      {formatShortDate(invite.expiresAt) ? (
        <span>Expires: {formatShortDate(invite.expiresAt)}</span>
      ) : null}
    </div>
  );
}
