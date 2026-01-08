import { useCallback, useEffect, useRef, useState } from 'react';
import { listSimulations } from '@/lib/api/recruiter';
import { errorToMessage } from '../../utils/formatters';
import type { SimulationListItem } from '@/types/recruiter';

function isAbortError(err: unknown) {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err &&
      typeof err === 'object' &&
      (err as { name?: unknown }).name === 'AbortError')
  );
}

export function useSimulations() {
  const [loading, setLoading] = useState(true);
  const [simulations, setSimulations] = useState<SimulationListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const inflightRef = useRef<Promise<SimulationListItem[]> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const simulationsRef = useRef<SimulationListItem[]>([]);

  const refresh = useCallback(async (force = false) => {
    if (!force && inflightRef.current) return inflightRef.current;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);

    const promise = listSimulations({
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((sims) => {
        setSimulations(Array.isArray(sims) ? sims : []);
        simulationsRef.current = Array.isArray(sims) ? sims : [];
        setError(null);
        return Array.isArray(sims) ? sims : [];
      })
      .catch((e: unknown) => {
        const fallback = simulationsRef.current;
        if (isAbortError(e)) return fallback;
        setError(errorToMessage(e, 'Failed to load simulations.'));
        return fallback;
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
        inflightRef.current = null;
      });

    inflightRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    simulationsRef.current = simulations;
  }, [simulations]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      void refresh(false);
    });
    return () => {
      active = false;
      controllerRef.current?.abort();
    };
  }, [refresh]);

  return { simulations, loading, error, refresh };
}
