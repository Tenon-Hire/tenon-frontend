import { StatusPill } from '@/shared/ui/StatusPill';
import { formatShortDate } from '@/shared/formatters/date';
import { statusMeta } from '@/shared/status/statusMeta';
import type { CandidateInvite } from '@/features/candidate/api';

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
