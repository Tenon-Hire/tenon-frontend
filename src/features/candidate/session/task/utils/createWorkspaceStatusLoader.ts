import { loadWorkspaceStatus } from './loadWorkspaceStatus';
import { sessionExpired, type WorkspaceLoadResult } from './workspaceResponses';

type LoaderRefs = {
  modeRef: { current: 'init' | 'refresh' };
  initAttemptedRef: { current: boolean };
};

type LoaderParams = LoaderRefs & {
  taskId: number;
  candidateSessionId: number;
  token: string | null;
};

export function createWorkspaceStatusLoader({
  taskId,
  candidateSessionId,
  token,
  modeRef,
  initAttemptedRef,
}: LoaderParams) {
  return (): Promise<WorkspaceLoadResult> => {
    if (!token) return Promise.resolve(sessionExpired());
    return loadWorkspaceStatus({
      mode: modeRef.current,
      taskId,
      candidateSessionId,
      token,
      initAttempted: initAttemptedRef.current,
    });
  };
}
