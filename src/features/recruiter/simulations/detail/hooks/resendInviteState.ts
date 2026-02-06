import type { CandidateSession } from '@/features/recruiter/types';
import type { ResendOutcome } from './resendInviteOutcome';
import type { RowState } from './types';
import type { UpdateRow } from './resendInviteTypes';

export const markPending = (updateRow: UpdateRow, id: string) =>
  updateRow(id, (p) => ({ ...p, resending: true, error: null, message: null }));

export const finishRow = (
  updateRow: UpdateRow,
  id: string,
  patch: Partial<RowState>,
) => updateRow(id, (p) => ({ ...p, ...patch }));

export const applyCooldown = (
  updateRow: UpdateRow,
  id: string,
  retryAfterSeconds: number | null | undefined,
  startCooldown: (id: string, retryAfterSeconds?: number | null) => void,
  message?: string,
) => {
  startCooldown(id, retryAfterSeconds);
  finishRow(updateRow, id, {
    resending: false,
    ...(message ? { message } : {}),
  });
};

export const updateLocalCandidate = (
  updateLocal: (
    updater: (prev: CandidateSession[]) => CandidateSession[],
  ) => void,
  id: string,
  candidate: CandidateSession,
) =>
  updateLocal((prev) =>
    prev.map((c) =>
      String(c.candidateSessionId) === id ? { ...c, ...candidate } : c,
    ),
  );

export const handleOutcome = (
  outcome: ResendOutcome,
  deps: {
    id: string;
    updateRow: UpdateRow;
    startCooldown: (id: string, retryAfterSeconds?: number | null) => void;
    finish: (id: string, patch: Partial<RowState>) => void;
    refresh: () => void;
    updateLocal: (
      updater: (prev: CandidateSession[]) => CandidateSession[],
    ) => void;
  },
) => {
  const { id, updateRow, startCooldown, finish, refresh, updateLocal } = deps;
  if (outcome.type === 'notFound') {
    finish(id, {
      resending: false,
      error: 'Candidate not found — refreshing list.',
    });
    refresh();
    return false;
  }

  if (outcome.type === 'rateLimited') {
    applyCooldown(updateRow, id, outcome.retryAfter, startCooldown);
    return false;
  }

  if (outcome.type === 'error') {
    finish(id, { resending: false, error: outcome.message });
    return false;
  }

  if (outcome.candidate)
    updateLocalCandidate(updateLocal, id, outcome.candidate);
  else refresh();

  if (outcome.rateLimited)
    applyCooldown(
      updateRow,
      id,
      outcome.retryAfter,
      startCooldown,
      outcome.statusMessage,
    );
  else finish(id, { resending: false, message: outcome.statusMessage });

  return !outcome.rateLimited;
};
