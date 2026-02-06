import { useCallback, useState } from 'react';
import { inviteCandidate } from '@/features/recruiter/api';
import { formatRecruiterError } from '../../utils/formatters';
import { friendlyInviteError, toSafeString } from '../utils/inviteHelpers';
import type {
  InviteModalState,
  InviteSuccess,
} from '@/features/recruiter/types';

export function useInviteCandidateFlow(simulation: InviteModalState | null) {
  const [state, setState] = useState<{
    status: 'idle' | 'loading' | 'error';
    message?: string;
  }>({ status: 'idle' });

  const submit = useCallback(
    async (
      candidateName: string,
      inviteEmail: string,
    ): Promise<InviteSuccess | null> => {
      const safeSimulationId = toSafeString(simulation?.simulationId).trim();
      if (!safeSimulationId) return null;

      const safeName = toSafeString(candidateName).trim();
      const safeEmail = toSafeString(inviteEmail).trim().toLowerCase();
      if (!safeName || !safeEmail) {
        setState({
          status: 'error',
          message: 'Candidate name and email are required.',
        });
        return null;
      }
      setState({ status: 'loading' });
      try {
        const res = await inviteCandidate(
          safeSimulationId,
          safeName,
          safeEmail,
        );

        setState({ status: 'idle' });
        return {
          inviteUrl: res.inviteUrl,
          outcome: res.outcome,
          simulationId: safeSimulationId,
          candidateName: safeName,
          candidateEmail: safeEmail,
        };
      } catch (e: unknown) {
        const friendlyMessage = friendlyInviteError(e);
        setState({
          status: 'error',
          message:
            friendlyMessage ??
            formatRecruiterError(e, 'Failed to invite candidate.'),
        });
        return null;
      }
    },
    [simulation],
  );

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, submit, reset };
}
