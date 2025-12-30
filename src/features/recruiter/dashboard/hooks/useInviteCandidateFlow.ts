import { useCallback, useState } from 'react';
import { inviteCandidate } from '@/lib/api/recruiter';
import { errorToMessage } from '../../utils/formatters';
import type { InviteModalState, InviteSuccess } from '@/types/recruiter';

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
      if (!simulation?.simulationId) return null;
      setState({ status: 'loading' });
      try {
        const res = await inviteCandidate(
          simulation.simulationId,
          candidateName,
          inviteEmail,
        );

        setState({ status: 'idle' });
        return {
          inviteUrl: res.inviteUrl,
          simulationId: simulation.simulationId,
          candidateName: candidateName.trim(),
          candidateEmail: inviteEmail.trim(),
        };
      } catch (e: unknown) {
        setState({
          status: 'error',
          message: errorToMessage(e, 'Failed to invite candidate.'),
        });
        return null;
      }
    },
    [simulation],
  );

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, submit, reset };
}
