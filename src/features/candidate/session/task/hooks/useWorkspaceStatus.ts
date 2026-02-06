'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotifications } from '@/shared/notifications';
import { useAsyncLoader } from '@/shared/hooks';
import type { CandidateWorkspaceStatus } from '@/features/candidate/api';
import { createWorkspaceStatusLoader } from '../utils/createWorkspaceStatusLoader';

type Params = {
  taskId: number;
  candidateSessionId: number;
  token: string | null;
};

export function useWorkspaceStatus({
  taskId,
  candidateSessionId,
  token,
}: Params) {
  const { notify } = useNotifications();
  const [workspace, setWorkspace] = useState<CandidateWorkspaceStatus | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const initAttemptedRef = useRef(false);
  const modeRef = useRef<'init' | 'refresh'>('init');

  const loader = useCallback(() => {
    const run = createWorkspaceStatusLoader({
      taskId,
      candidateSessionId,
      token,
      modeRef,
      initAttemptedRef,
    });
    return run();
  }, [candidateSessionId, taskId, token]);

  const { load, abort } = useAsyncLoader(loader, {
    immediate: false,
    onSuccess: (result) => {
      if (result.workspace) {
        setWorkspace(result.workspace);
        initAttemptedRef.current = true;
      }
      setNotice(result.notice);
      setError(result.error);
      if (result.notify) {
        const id =
          result.notify.tone === 'success'
            ? `workspace-${taskId}-refresh`
            : `workspace-${taskId}-error`;
        notify({ id, ...result.notify });
      }
      if (modeRef.current === 'init') setLoading(false);
      else setRefreshing(false);
    },
    onError: (err) => {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to load your workspace right now.';
      setError(message);
      setLoading(false);
      setRefreshing(false);
      return message;
    },
  });

  useEffect(() => {
    modeRef.current = 'init';
    const id = window.setTimeout(() => {
      void load(true);
    }, 0);
    return () => {
      window.clearTimeout(id);
      abort();
    };
  }, [abort, load]);

  const refresh = () => {
    if (loading || refreshing) return;
    modeRef.current = 'refresh';
    setRefreshing(true);
    void load(true);
  };

  return { workspace, loading, refreshing, error, notice, refresh };
}
