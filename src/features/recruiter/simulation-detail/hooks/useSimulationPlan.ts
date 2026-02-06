import { useCallback, useEffect, useState } from 'react';
import { recruiterBffClient } from '@/lib/api/httpClient';
import { normalizeSimulationPlan, type SimulationPlan } from '../utils/plan';

type Params = { simulationId: string };

export function useSimulationPlan({ simulationId }: Params) {
  const [plan, setPlan] = useState<SimulationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlan = useCallback(
    async (opts?: { skipCache?: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await recruiterBffClient.get<unknown>(
          `/simulations/${simulationId}`,
          {
            cache: 'no-store',
            skipCache: opts?.skipCache,
            cacheTtlMs: 12000,
          },
        );
        setPlan(normalizeSimulationPlan(data));
      } catch (caught: unknown) {
        setError(
          caught instanceof Error && caught.message
            ? caught.message
            : 'Failed to load simulation details.',
        );
        setPlan(null);
      } finally {
        setLoading(false);
      }
    },
    [simulationId],
  );

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  return { plan, loading, error, reload: () => loadPlan({ skipCache: true }) };
}
