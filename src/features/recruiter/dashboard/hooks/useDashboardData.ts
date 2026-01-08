import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildLoginUrl,
  buildNotAuthorizedUrl,
  buildReturnTo,
} from '@/lib/auth/routing';
import { toUserMessage } from '@/lib/utils/errors';
import type { RecruiterProfile, SimulationListItem } from '@/types/recruiter';

type Options = {
  initialProfile?: RecruiterProfile | null;
  initialProfileError?: string | null;
  fetchOnMount?: boolean;
};

type DashboardPayload = {
  profile: RecruiterProfile | null;
  simulations: SimulationListItem[];
  profileError: string | null;
  simulationsError: string | null;
};

type Inflight = {
  dashboard?: Promise<DashboardPayload>;
};

type Controllers = {
  dashboard?: AbortController;
};

function isAbortError(err: unknown) {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err &&
      typeof err === 'object' &&
      (err as { name?: unknown }).name === 'AbortError')
  );
}

export function useDashboardData(options?: Options) {
  const [profile, setProfile] = useState<RecruiterProfile | null>(
    options?.initialProfile ?? null,
  );
  const [profileError, setProfileError] = useState<string | null>(
    options?.initialProfileError ?? null,
  );
  const [simulations, setSimulations] = useState<SimulationListItem[]>([]);
  const [simError, setSimError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(
    options?.fetchOnMount !== false,
  );
  const [loadingSimulations, setLoadingSimulations] = useState(
    options?.fetchOnMount !== false,
  );

  const inflightRef = useRef<Inflight>({});
  const controllersRef = useRef<Controllers>({});
  const requestIdRef = useRef(0);

  const fetchDashboard = useCallback((force = false) => {
    if (!force && inflightRef.current.dashboard) {
      return inflightRef.current.dashboard;
    }

    controllersRef.current.dashboard?.abort();
    const controller = new AbortController();
    controllersRef.current.dashboard = controller;

    const promise = (async () => {
      const res = await fetch('/api/dashboard', {
        cache: 'no-store',
        credentials: 'include',
        signal: controller.signal,
      });
      const parsed: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const status = res.status;
        if (
          typeof window !== 'undefined' &&
          (status === 401 || status === 403)
        ) {
          const returnTo = buildReturnTo();
          const mode = 'recruiter';
          const destination =
            status === 401
              ? buildLoginUrl(mode, returnTo)
              : buildNotAuthorizedUrl(mode, returnTo);
          window.location.assign(destination);
        }
        const error = new Error(
          toUserMessage(parsed, 'Unable to load your dashboard right now.', {
            includeDetail: true,
          }),
        ) as Error & { status?: number };
        error.status = status;
        throw error;
      }

      return parsed as DashboardPayload;
    })().finally(() => {
      if (inflightRef.current.dashboard === promise) {
        inflightRef.current.dashboard = undefined;
      }
    });

    inflightRef.current.dashboard = promise;
    return promise;
  }, []);

  const refresh = useCallback(
    (force = true) => {
      const requestId = ++requestIdRef.current;
      setLoadingProfile(true);
      setLoadingSimulations(true);
      setProfileError(null);
      setSimError(null);

      const dashboardPromise = fetchDashboard(force);

      dashboardPromise
        .then((result) => {
          if (requestIdRef.current !== requestId) return;
          setProfile(result?.profile ?? null);
          setSimulations(
            Array.isArray(result?.simulations) ? result.simulations : [],
          );
          setProfileError(result?.profileError ?? null);
          setSimError(result?.simulationsError ?? null);
        })
        .catch((err: unknown) => {
          if (isAbortError(err) || requestIdRef.current !== requestId) return;
          const status =
            err && typeof err === 'object'
              ? (err as { status?: unknown }).status
              : null;
          if (status === 401 || status === 403) return;
          setProfileError(
            toUserMessage(err, 'Unable to load your profile right now.', {
              includeDetail: true,
            }),
          );
          setSimError(
            toUserMessage(err, 'Failed to load simulations.', {
              includeDetail: true,
            }),
          );
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) return;
          setLoadingProfile(false);
          setLoadingSimulations(false);
        });

      return dashboardPromise;
    },
    [fetchDashboard],
  );

  useEffect(() => {
    const controllers = controllersRef.current;
    if (options?.fetchOnMount === false) {
      return () => {
        controllers.dashboard?.abort();
      };
    }

    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      void refresh(false);
    });

    return () => {
      active = false;
      controllers.dashboard?.abort();
    };
  }, [controllersRef, options?.fetchOnMount, refresh]);

  return {
    profile,
    profileError,
    simulations,
    simError,
    loadingProfile,
    loadingSimulations,
    refresh,
  };
}
