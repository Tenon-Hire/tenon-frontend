import { useCallback, useEffect, useRef, useState } from 'react';
import { toStatus, toUserMessage } from '@/lib/errors/errors';
import type { CandidateSession } from '@/features/recruiter/types';
import { listSimulationCandidates } from '@/features/recruiter/api';

type Params = { simulationId: string };

export function useSimulationCandidates({ simulationId }: Params) {
  const [candidates, setCandidates] = useState<CandidateSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setCandidates([]);
    setError(null);
    setLoading(true);
  }, [simulationId]);

  const loadCandidates = useCallback(
    async (opts?: { skipCache?: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        const list = await listSimulationCandidates(simulationId, {
          cache: 'no-store',
          skipCache: opts?.skipCache,
          cacheTtlMs: 9000,
        });
        if (!mountedRef.current) return;
        setCandidates(Array.isArray(list) ? list : []);
      } catch (e: unknown) {
        if (!mountedRef.current) return;
        const status = toStatus(e);
        if (status === 401) {
          setError('Session expired. Please sign in again.');
          return;
        }
        if (status === 403) {
          setError('You are not authorized to view candidates.');
          return;
        }
        let message =
          typeof e === 'string'
            ? 'Request failed'
            : toUserMessage(e, 'Request failed', { includeDetail: false });
        if (status && status >= 500) {
          if (/request failed with status/i.test(message)) {
            message = 'Request failed';
          }
        }
        setError(message || 'Request failed');
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [simulationId],
  );

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  return {
    candidates,
    loading,
    error,
    reload: () => loadCandidates({ skipCache: true }),
    setCandidates,
  };
}
