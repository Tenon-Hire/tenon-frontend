import { useCallback, useState } from 'react';
import { inviteCandidate } from '@/lib/api/recruiter';
import { errorToMessage } from '../../utils/formatters';
import type { InviteModalState, InviteSuccess } from '@/types/recruiter';

export function useInviteCandidateFlow(simulation: InviteModalState | null) {
  const [state, setState] = useState<{
    status: 'idle' | 'loading' | 'error';
    message?: string;
  }>({ status: 'idle' });

  const toSafeString = useCallback((value: unknown) => {
    if (value && typeof value === 'object') {
      const maybeEvent = value as {
        target?: { value?: unknown };
        currentTarget?: { value?: unknown };
        value?: unknown;
      };
      const candidate =
        maybeEvent.value ??
        maybeEvent.target?.value ??
        maybeEvent.currentTarget?.value;
      if (typeof candidate === 'string' || typeof candidate === 'number') {
        return String(candidate);
      }
    }

    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    return '';
  }, []);

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
          simulationId: safeSimulationId,
          candidateName: safeName,
          candidateEmail: safeEmail,
        };
      } catch (e: unknown) {
        setState({
          status: 'error',
          message: errorToMessage(e, 'Failed to invite candidate.'),
        });
        return null;
      }
    },
    [simulation, toSafeString],
  );

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, submit, reset };
}
