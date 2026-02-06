import { requestWithMeta } from '@/lib/api/client/request';
import { ensureAuthToken, withCandidateAuth } from './base';
import type {
  CandidateCurrentTaskResponse,
  CandidateTaskSubmitResponse,
} from './types';
import { normalizeTask } from './tasksNormalize';
import { mapCurrentTaskError, mapSubmitTaskError } from './taskErrors';

export async function getCandidateCurrentTask(
  candidateSessionId: number,
  token: string,
  options?: { skipCache?: boolean; cacheTtlMs?: number; dedupeKey?: string },
) {
  ensureAuthToken(token);
  const path = `/candidate/session/${candidateSessionId}/current_task`;
  try {
    const { data } = await requestWithMeta<CandidateCurrentTaskResponse>(
      path,
      {
        headers: { 'x-candidate-session-id': String(candidateSessionId) },
        cache: 'no-store',
        skipCache: options?.skipCache,
        cacheTtlMs: options?.cacheTtlMs,
        dedupeKey: options?.dedupeKey,
      },
      withCandidateAuth(token),
    );
    const currentTask = normalizeTask(data?.currentTask);
    return {
      ...data,
      currentTask,
      completedTaskIds:
        data?.completedTaskIds ?? data?.progress?.completedTaskIds ?? [],
    };
  } catch (err) {
    mapCurrentTaskError(err);
  }
}

export async function submitCandidateTask(params: {
  taskId: number;
  token: string;
  candidateSessionId: number;
  contentText?: string;
}) {
  const { taskId, token, candidateSessionId, contentText } = params;
  ensureAuthToken(token);
  const path = `/tasks/${taskId}/submit`;
  const payload = typeof contentText === 'string' ? { contentText } : {};

  try {
    const { data } = await requestWithMeta<CandidateTaskSubmitResponse>(
      path,
      {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'x-candidate-session-id': String(candidateSessionId),
        },
        cache: 'no-store',
      },
      withCandidateAuth(token),
    );
    return data;
  } catch (err) {
    mapSubmitTaskError(err);
  }
}
