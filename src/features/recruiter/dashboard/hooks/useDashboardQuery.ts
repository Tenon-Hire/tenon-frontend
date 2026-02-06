import { useEffect, useRef, useState } from 'react';
import type { DashboardOptions, DashboardPayload } from './dashboardTypes';
import {
  makeInitialDashboardState,
  type DashboardState,
} from './dashboardState';
import { useDashboardRefresh } from './useDashboardRefresh';

export function useDashboardQuery(options?: DashboardOptions) {
  const [state, setState] = useState<DashboardState>(() =>
    makeInitialDashboardState(options),
  );
  const inflightRef = useRef<Promise<DashboardPayload> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);

  const { refresh, abort } = useDashboardRefresh(setState, {
    inflightRef,
    controllerRef,
    requestSeqRef,
  });

  useEffect(() => {
    if (options?.fetchOnMount === false) return abort;
    const timer = window.setTimeout(() => void refresh(true), 0);
    return () => {
      window.clearTimeout(timer);
      abort();
    };
  }, [abort, options?.fetchOnMount, refresh]);

  return { ...state, refresh, abort };
}
