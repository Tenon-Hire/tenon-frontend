import { copyInviteLink } from '@/features/recruiter/utils/formatters';
import type { CandidateSession } from '@/features/recruiter/types';
import type { RowState } from './types';

type UpdateRow = (id: string, next: (prev: RowState) => RowState) => void;
type Notify = (opts: {
  id: string;
  tone: 'success' | 'error';
  title: string;
  description?: string;
}) => void;

export function useInviteCopyActions(updateRow: UpdateRow, notify: Notify) {
  const handleCopy = async (candidate: CandidateSession) => {
    const link = candidate.inviteUrl?.trim() || null;
    const id = String(candidate.candidateSessionId);
    if (!link) {
      updateRow(id, (prev) => ({
        ...prev,
        copied: false,
        error: 'Invite link unavailable — resend invite or refresh.',
        manualCopyOpen: false,
        manualCopyUrl: null,
      }));
      return;
    }

    const ok = await copyInviteLink(link);
    updateRow(id, (prev) => ({
      ...prev,
      copied: ok,
      error: ok ? null : 'Unable to copy invite link.',
      message: ok ? 'Invite link copied' : null,
      manualCopyOpen: ok ? false : true,
      manualCopyUrl: ok ? null : link,
    }));
    notify({
      id: `invite-copy-${id}`,
      tone: ok ? 'success' : 'error',
      title: ok ? 'Invite link copied' : 'Unable to copy invite link',
      description: ok
        ? 'Share the link with the candidate.'
        : 'Use the manual copy option instead.',
    });
    if (ok) {
      window.setTimeout(() => {
        updateRow(id, (prev) => ({ ...prev, copied: false, message: null }));
      }, 1800);
    }
  };

  const closeManualCopy = (id: string) =>
    updateRow(id, (prev) => ({
      ...prev,
      manualCopyOpen: false,
      manualCopyUrl: null,
    }));

  return { handleCopy, closeManualCopy };
}
