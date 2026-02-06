'use client';
import Button from '@/shared/ui/Button';
import { StatusPill } from '@/shared/ui/StatusPill';
import type { CandidateSession } from '@/features/recruiter/types';
import { formatCooldown } from '../utils/formatters';
import { ManualInviteLink } from './ManualInviteLink';
import type { RowState } from '../hooks/types';

type Props = {
  candidate: CandidateSession;
  rowState: RowState;
  inviteLink: string | null;
  cooldownNow: number;
  onCopy: (candidate: CandidateSession) => void;
  onResend: (candidate: CandidateSession) => void;
  onCloseManual: (id: number) => void;
};

export function CandidateInviteActions({
  candidate,
  rowState,
  inviteLink,
  cooldownNow,
  onCopy,
  onResend,
  onCloseManual,
}: Props) {
  const cooldownActive =
    typeof rowState.cooldownUntilMs === 'number' &&
    rowState.cooldownUntilMs > cooldownNow;
  const cooldownRemainingMs = cooldownActive
    ? Math.max(0, (rowState.cooldownUntilMs ?? 0) - cooldownNow)
    : null;
  const resendDisabled = rowState.resending || cooldownActive;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onCopy(candidate)}
          disabled={rowState.resending || !inviteLink}
        >
          {rowState.copied ? 'Copied' : 'Copy invite link'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onResend(candidate)}
          disabled={resendDisabled}
        >
          {rowState.resending ? 'Resending…' : 'Resend invite'}
        </Button>
      </div>

      {!inviteLink && (
        <div className="text-xs text-gray-600">
          Invite link unavailable — resend invite or refresh.
        </div>
      )}

      {rowState.manualCopyOpen && rowState.manualCopyUrl ? (
        <ManualInviteLink
          url={rowState.manualCopyUrl}
          onClose={() => onCloseManual(candidate.candidateSessionId)}
        />
      ) : null}

      {cooldownActive && (
        <div className="text-xs text-gray-600">
          {cooldownRemainingMs
            ? formatCooldown(cooldownRemainingMs)
            : 'Rate limited — try again soon'}
        </div>
      )}

      {rowState.error ? (
        <div className="text-xs text-red-600">{rowState.error}</div>
      ) : null}

      {rowState.message ? (
        <StatusPill label={rowState.message} tone="success" />
      ) : null}
    </div>
  );
}
