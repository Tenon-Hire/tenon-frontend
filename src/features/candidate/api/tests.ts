import { requestWithMeta } from '@/lib/api/client/request';
import { HttpError } from '@/lib/api/errors/errors';
import {
  ensureAuthToken,
  mapCandidateApiError,
  withCandidateAuth,
} from './base';
import { normalizeRunId, normalizeRunStatus } from './testNormalize';
import type {
  CandidateTestRunStartResponse,
  CandidateTestRunStatusResponse,
} from './types';

export async function startCandidateTestRun(params: {
  taskId: number;
  token: string;
  candidateSessionId: number;
}): Promise<CandidateTestRunStartResponse> {
  const { taskId, token, candidateSessionId } = params;
  ensureAuthToken(token);
  const path = `/tasks/${taskId}/run`;

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
    const run = normalizeRunId(data);
    if (run) return run;
    throw new HttpError(500, 'Missing run id from test run.');
  } catch (err) {
    if (err instanceof TypeError) {
      throw new HttpError(
        0,
        'Network error. Please check your connection and try again.',
      );
    }
    mapCandidateApiError(err, 'Unable to start tests right now.');
  }
}

export async function pollCandidateTestRun(params: {
  taskId: number;
  runId: string;
  token: string;
  candidateSessionId: number;
}): Promise<CandidateTestRunStatusResponse> {
  const { taskId, runId, token, candidateSessionId } = params;
  ensureAuthToken(token);
  const path = `/tasks/${taskId}/run/${encodeURIComponent(runId)}`;

  try {
    const { data } = await requestWithMeta<unknown>(
      path,
      {
        headers: { 'x-candidate-session-id': String(candidateSessionId) },
        cache: 'no-store',
      },
      withCandidateAuth(token),
    );
    return normalizeRunStatus(data);
  } catch (err) {
    if (err instanceof TypeError) {
      throw new HttpError(
        0,
        'Network error. Please check your connection and try again.',
      );
    }
    mapCandidateApiError(err, 'Unable to check test status right now.');
  }
}
