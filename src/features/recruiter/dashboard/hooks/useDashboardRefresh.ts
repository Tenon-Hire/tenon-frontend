import { useCallback } from 'react';
import { useAsyncLoader } from '@/features/shared/hooks';
import { dashboardPerfDebugEnabled, logPerf, nowMs } from '../utils/perf';
import type { DashboardPayload } from './dashboardTypes';
import { fetchDashboard, isAbortError } from './dashboardApi';
import type { DashboardState } from './dashboardState';

type Refs = {
  inflightRef: React.MutableRefObject<Promise<DashboardPayload> | null>;
  controllerRef: React.MutableRefObject<AbortController | null>;
  requestSeqRef: React.MutableRefObject<number>;
};

export function useDashboardRefresh(
  setState: React.Dispatch<React.SetStateAction<DashboardState>>,
  refs: Refs,
) {
  const { inflightRef, controllerRef, requestSeqRef } = refs;

  const loader = useCallback(
    (signal?: AbortSignal) => fetchDashboard(signal),
    [],
  );

  const { load, abort } = useAsyncLoader(loader, {
    immediate: false,
    onSuccess: (data) => {
      setState((prev) => ({
        ...prev,
        profile: data?.profile ?? null,
        simulations: Array.isArray(data?.simulations) ? data.simulations : [],
        requestId: data?.requestId ?? null,
        profileError: data?.profileError ?? null,
        simError: data?.simulationsError ?? null,
        loadingProfile: false,
        loadingSimulations: false,
      }));
      if (dashboardPerfDebugEnabled)
        logPerf('/api/dashboard response', nowMs(), { status: 200 });
    },
    onError: (err) => {
      if (isAbortError(err)) {
        setState((prev) => ({
          ...prev,
          loadingProfile: false,
          loadingSimulations: false,
        }));
        return null;
      }
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to load your dashboard.';
      setState((prev) => ({
        ...prev,
        profileError: message,
        simError: message,
        loadingProfile: false,
        loadingSimulations: false,
      }));
      if (dashboardPerfDebugEnabled)
        logPerf('/api/dashboard response', nowMs(), { status: 'error' });
      return message;
    },
  });

  const refresh = useCallback(
    (force = true) => {
      if (!force && inflightRef.current) return inflightRef.current;
      controllerRef.current?.abort();
      controllerRef.current = null;
      requestSeqRef.current += 1;
      setState((prev) => ({
        ...prev,
        profileError: null,
        simError: null,
        loadingProfile: true,
        loadingSimulations: true,
      }));
      const run = load(true) as Promise<DashboardPayload>;
      inflightRef.current = run;
      return run;
    },
    [controllerRef, inflightRef, load, requestSeqRef, setState],
  );

  return { refresh, abort };
}
