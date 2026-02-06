import { useEffect, useRef } from 'react';
import { fetchArtifactsWithLimit } from '../utils/data';
import type { SubmissionArtifact, SubmissionListItem } from '../types';

type Params = {
  showAll: boolean;
  pagedItems: SubmissionListItem[];
  artifacts: Record<number, SubmissionArtifact>;
  setArtifacts: React.Dispatch<
    React.SetStateAction<Record<number, SubmissionArtifact>>
  >;
};

export function useArtifactsForPage({
  showAll,
  pagedItems,
  artifacts,
  setArtifacts,
}: Params) {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!showAll) return;
    const missing = pagedItems
      .map((it) => it.submissionId)
      .filter((id) => !artifacts[id]);
    if (!missing.length) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    fetchArtifactsWithLimit(missing, {
      signal: controller.signal,
      cacheTtlMs: 10000,
    })
      .then(({ results }) => {
        if (controller.signal.aborted) return;
        setArtifacts((prev) => ({ ...prev, ...results }));
      })
      .catch(() => {});

    return () => controller.abort();
  }, [artifacts, pagedItems, setArtifacts, showAll]);
}
