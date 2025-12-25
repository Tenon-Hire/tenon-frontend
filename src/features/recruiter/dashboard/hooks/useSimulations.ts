import { useCallback, useEffect, useState } from 'react';
import { listSimulations } from '@/lib/api/recruiter';
import { errorToMessage } from '../../helpers/formatters';
import type { SimulationListItem } from '../types';

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
