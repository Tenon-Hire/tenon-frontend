import { useCallback, useEffect, useState } from 'react';
import { inviteCandidate, listSimulations } from '@/lib/recruiterApi';
import { errorToMessage } from '../helpers';
import type {
  InviteModalState,
  InviteSuccess,
  SimulationListItem,
} from './types';

export function useSimulations() {
  const [loading, setLoading] = useState(true);
  const [simulations, setSimulations] = useState<SimulationListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sims = await listSimulations();
      setSimulations(Array.isArray(sims) ? sims : []);
    } catch (e: unknown) {
      setError(errorToMessage(e, 'Failed to load simulations.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { simulations, loading, error, refresh };
}

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
