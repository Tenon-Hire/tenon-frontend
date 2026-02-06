import {
  getCandidateWorkspaceStatus,
  initCandidateWorkspace,
  type CandidateWorkspaceStatus,
} from '@/lib/api/candidate';
import { normalizeApiError, toStatus } from '@/lib/utils/errors';
import { buildWorkspaceMessage } from './workspaceMessages';
import {
  provisioning,
  refreshed,
  sessionExpired,
  success,
  workspaceError,
  type WorkspaceLoadResult,
} from './workspaceResponses';

type Params = {
  mode: 'init' | 'refresh';
  taskId: number;
  candidateSessionId: number;
  token: string;
  initAttempted: boolean;
};

async function fetchOrInitWorkspace(
  mode: 'init' | 'refresh',
  initAttempted: boolean,
  taskId: number,
  token: string,
  candidateSessionId: number,
): Promise<CandidateWorkspaceStatus | null> {
  try {
    const status = await getCandidateWorkspaceStatus({
      taskId,
      token,
      candidateSessionId,
    });
    const needsInit =
      !status?.repoUrl && !status?.repoName && !status?.codespaceUrl;
    if (mode === 'init' && needsInit && !initAttempted) {
      return await initCandidateWorkspace({
        taskId,
        token,
        candidateSessionId,
      });
    }
    return status;
  } catch (err) {
    if (mode === 'init' && toStatus(err) === 404 && !initAttempted) {
      return initCandidateWorkspace({ taskId, token, candidateSessionId });
    }
    throw err;
  }
}

export async function loadWorkspaceStatus({
  mode,
  taskId,
  candidateSessionId,
  token,
  initAttempted,
}: Params): Promise<WorkspaceLoadResult> {
  try {
    const workspace = await fetchOrInitWorkspace(
      mode,
      initAttempted,
      taskId,
      token,
      candidateSessionId,
    );
    if (mode === 'refresh' && workspace) {
      return refreshed(workspace, buildWorkspaceMessage(workspace));
    }
    return success(workspace);
  } catch (err) {
    const normalized = normalizeApiError(
      err,
      'Unable to load your workspace right now.',
    );
    const status = toStatus(err);
    const isSignin =
      status === 401 || status === 403 || normalized.action === 'signin';
    if (isSignin) return sessionExpired();
    if (status === 409) return provisioning();
    return workspaceError(mode, normalized.message);
  }
}
