import { requestWithMeta } from '@/lib/api/client/request';
import { HttpError } from '@/lib/api/errors/errors';
import {
  ensureAuthToken,
  mapCandidateApiError,
  withCandidateAuth,
  toStringOrNull,
} from './base';
import type { CandidateWorkspaceStatus } from './types';

function normalizeWorkspaceStatus(data: unknown): CandidateWorkspaceStatus {
  if (!data || typeof data !== 'object') {
    return {
      repoUrl: null,
      repoName: null,
      repoFullName: null,
      codespaceUrl: null,
    };
  }
  const rec = data as Record<string, unknown>;
  const repoUrl = toStringOrNull(rec.repoUrl ?? rec.repo_url) ?? null;
  const repoFullName =
    toStringOrNull(rec.repoFullName ?? rec.repo_full_name) ?? null;
  const repoName =
    toStringOrNull(rec.repoName ?? rec.repo_name) ?? repoFullName ?? null;
  const codespaceUrl =
    toStringOrNull(rec.codespaceUrl ?? rec.codespace_url) ?? null;
  return { repoUrl, repoName, repoFullName, codespaceUrl };
}

export async function initCandidateWorkspace(params: {
  taskId: number;
  token: string;
  candidateSessionId: number;
}): Promise<CandidateWorkspaceStatus> {
  const { taskId, token, candidateSessionId } = params;
  ensureAuthToken(token);
  const path = `/tasks/${taskId}/codespace/init`;

  try {
    const { data } = await requestWithMeta<unknown>(
      path,
      {
        method: 'POST',
        body: {},
        headers: { 'x-candidate-session-id': String(candidateSessionId) },
        cache: 'no-store',
      },
      withCandidateAuth(token),
    );
    return normalizeWorkspaceStatus(data);
  } catch (err) {
    if (err instanceof TypeError) {
      throw new HttpError(
        0,
        'Network error. Please check your connection and try again.',
      );
    }
    mapCandidateApiError(err, 'Unable to load your workspace right now.');
  }
}

export async function getCandidateWorkspaceStatus(params: {
  taskId: number;
  token: string;
  candidateSessionId: number;
}): Promise<CandidateWorkspaceStatus> {
  const { taskId, token, candidateSessionId } = params;
  ensureAuthToken(token);
  const path = `/tasks/${taskId}/codespace/status`;

  try {
    const { data } = await requestWithMeta<unknown>(
      path,
      {
        headers: { 'x-candidate-session-id': String(candidateSessionId) },
        cache: 'no-store',
      },
      withCandidateAuth(token),
    );
    return normalizeWorkspaceStatus(data);
  } catch (err) {
    if (err instanceof TypeError) {
      throw new HttpError(
        0,
        'Network error. Please check your connection and try again.',
      );
    }
    mapCandidateApiError(err, 'Unable to load your workspace right now.');
  }
}
