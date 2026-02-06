import { useCallback, useEffect, useRef } from 'react';
import { useAsyncLoader } from '@/features/shared/hooks';
import { reloadCandidateSubmissions } from './reloadCandidateSubmissions';
import type { LoaderSetters } from './loaderTypes';
type LoaderParams = {
  simulationId: string;
  candidateSessionId: string;
  pageSize: number;
  showAll: boolean;
  setters: LoaderSetters;
};

export function useCandidateSubmissionsLoader({
  simulationId,
  candidateSessionId,
  pageSize,
  showAll,
  setters,
}: LoaderParams) {
  const showAllRef = useRef(showAll);
  const pendingOptsRef = useRef<{ skipCache?: boolean } | null>(null);

  const applyResult = useCallback(
    (result: Awaited<ReturnType<typeof reloadCandidateSubmissions>>) => {
      setters.setCandidate(result.candidate);
      setters.setItems(result.items);
      setters.setArtifacts((prev) => ({
        ...prev,
        ...result.artifacts,
      }));
      setters.setArtifactWarning(result.artifactWarning);
      setters.setError(result.error);
    },
    [setters],
  );

  const loader = useCallback(
    (signal?: AbortSignal) =>
      reloadCandidateSubmissions({
        simulationId,
        candidateSessionId,
        pageSize,
        showAll: showAllRef.current,
        skipCache: pendingOptsRef.current?.skipCache,
        signal: signal ?? new AbortController().signal,
      }),
    [candidateSessionId, pageSize, simulationId],
  );

  const { load, abort, loading } = useAsyncLoader(loader, {
    onSuccess: applyResult,
    onError: (err) =>
      err instanceof Error && err.message ? err.message : 'Request failed',
    immediate: false,
  });

  const reload = useCallback(
    (opts?: { skipCache?: boolean }) => {
      pendingOptsRef.current = opts ?? null;
      setters.setArtifactWarning(null);
      setters.setError(null);
      setters.setLoading(true);
      return load(true).catch(() => {});
    },
    [load, setters],
  );

  useEffect(() => {
    showAllRef.current = showAll;
  }, [showAll]);

  useEffect(() => {
    reload().catch(() => {});
    return () => abort();
  }, [abort, reload]);

  const toggleShowAll = useCallback(() => {
    const next = !showAllRef.current;
    showAllRef.current = next;
    setters.setShowAll(next);
  }, [setters]);

  useEffect(() => {
    setters.setLoading(loading);
  }, [loading, setters]);

  return { reload, toggleShowAll, setArtifacts: setters.setArtifacts };
}
