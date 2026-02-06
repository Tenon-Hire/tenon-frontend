'use client';
import type { CandidateSession } from '@/types/recruiter';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatDateTime, inviteStatusMeta } from '../utils/formatters';
import { CandidateInviteActions } from './CandidateInviteActions';
import type { RowState } from '../hooks/types';

type Props = {
  candidate: CandidateSession;
  rowState: RowState;
  cooldownNow: number;
  onCopy: (candidate: CandidateSession) => void;
  onResend: (candidate: CandidateSession) => void;
  onCloseManual: (id: number) => void;
};

export function CandidateInviteCell({
  candidate,
  rowState,
  cooldownNow,
  onCopy,
  onResend,
  onCloseManual,
}: Props) {
  const inviteLink = candidate.inviteUrl?.trim() || null;
  const sentAt = formatDateTime(candidate.inviteEmailSentAt ?? null);
  const inviteStatus = inviteStatusMeta(candidate.inviteEmailStatus ?? null);

  return (
    <td className="px-4 py-3 align-top text-gray-700">
      <div className="flex flex-col gap-1">
        <StatusPill label={inviteStatus.label} tone={inviteStatus.tone} />
        <div className="text-xs text-gray-500">
          {sentAt ? `Sent at ${sentAt}` : 'Not sent yet'}
        </div>
        {candidate.inviteEmailError ? (
          <div className="text-xs text-red-600">
            {candidate.inviteEmailError}
          </div>
        ) : null}
        <CandidateInviteActions
          candidate={candidate}
          rowState={rowState}
          inviteLink={inviteLink}
          cooldownNow={cooldownNow}
          onCopy={onCopy}
          onResend={onResend}
          onCloseManual={onCloseManual}
        />
      </div>
    </td>
  );
}
