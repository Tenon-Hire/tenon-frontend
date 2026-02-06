import { useCallback } from 'react';
import type { CandidateSession } from '@/types/recruiter';
import type { Notify, UpdateRow } from './resendInviteTypes';
import { fetchResendOutcome } from './resendInviteService';
import { finishRow, handleOutcome, markPending } from './resendInviteState';
import { notifyError, notifySuccess } from './resendInviteNotifications';
import { useInviteCooldown } from './useInviteCooldown';

export function useResendInviteAction(
  simulationId: string,
  updateRow: UpdateRow,
  refresh: () => void,
  updateLocal: (
    updater: (prev: CandidateSession[]) => CandidateSession[],
  ) => void,
  notify: Notify,
) {
  const startCooldown = useInviteCooldown(updateRow);

  const handleResend = useCallback(
    async (candidate: CandidateSession) => {
      const id = String(candidate.candidateSessionId);
      markPending(updateRow, id);
      try {
        const outcome = await fetchResendOutcome(simulationId, candidate);
        const ok = handleOutcome(outcome, {
          id,
          updateRow,
          startCooldown,
          finish: (rowId, patch) => finishRow(updateRow, rowId, patch),
          refresh,
          updateLocal,
        });
        if (outcome.type === 'error') {
          notifyError(notify, id, outcome.message);
        } else if (ok) {
          notifySuccess(notify, id);
        }
        return ok;
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Unable to resend invite.';
        finishRow(updateRow, id, { resending: false, error: message });
        notifyError(notify, id, message);
        return false;
      }
    },
    [notify, refresh, simulationId, startCooldown, updateLocal, updateRow],
  );

  return { handleResend };
}
