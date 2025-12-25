import { apiClient, type ApiClientOptions } from './apiClient';
import {
  HttpError,
  extractBackendMessage,
  fallbackStatus,
  toHttpError,
} from './api/errors';

export { HttpError };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const clientOptions: ApiClientOptions = {
  basePath: API_BASE || '',
  skipAuth: true,
};

type SimulationSummary = { title: string; role: string };

export type CandidateSessionBootstrapResponse = {
  candidateSessionId: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'expired';
  simulation: SimulationSummary;
};

type TaskType =
  | 'design'
  | 'code'
  | 'debug'
  | 'handoff'
  | 'documentation'
  | string;

export type CandidateTask = {
  id: number;
  dayIndex: number;
  type: TaskType;
  title: string;
  description: string;
};

export type CandidateCurrentTaskResponse = {
  isComplete: boolean;
  completedTaskIds?: number[];
  progress?: { completedTaskIds?: number[] };
  currentTask: CandidateTask | null;
};

export type CandidateTaskSubmitResponse = {
  submissionId: number;
  taskId: number;
  candidateSessionId: number;
  submittedAt: string;
  progress: {
    completed: number;
    total: number;
  };
  isComplete: boolean;
};

export async function resolveCandidateInviteToken(token: string) {
  const path = `/candidate/session/${encodeURIComponent(token)}`;

  try {
    return await apiClient.get<CandidateSessionBootstrapResponse>(
      path,
      { cache: 'no-store' },
      clientOptions,
    );
  } catch (err: unknown) {
    if (err && typeof err === 'object') {
      const status = (err as { status?: unknown }).status;
      if (status === 404)
        throw new HttpError(404, 'That invite link is invalid.');
      if (status === 410)
        throw new HttpError(410, 'That invite link has expired.');

      const backendMsg = extractBackendMessage(
        (err as { details?: unknown }).details,
        false,
      );

      const safeStatus =
        typeof status === 'number' ? status : fallbackStatus(err, 500);

      throw new HttpError(
        safeStatus,
        backendMsg?.trim() || 'Something went wrong loading your simulation.',
      );
    }

    throw toHttpError(err, {
      status: 500,
      message: 'Something went wrong loading your simulation.',
    });
  }
}

export async function getCandidateCurrentTask(
  candidateSessionId: number,
  token: string,
) {
  const path = `/candidate/session/${candidateSessionId}/current_task`;

  try {
    return await apiClient.get<CandidateCurrentTaskResponse>(
      path,
      {
        headers: { 'x-candidate-token': token },
        cache: 'no-store',
      },
      clientOptions,
    );
  } catch (err: unknown) {
    if (err instanceof TypeError) {
      throw new HttpError(
        0,
        'Network error. Please check your connection and try again.',
      );
    }

    if (err && typeof err === 'object') {
      const status = (err as { status?: unknown }).status;
      if (typeof status !== 'number') {
        throw new HttpError(
          0,
          'Network error. Please check your connection and try again.',
        );
      }
      const backendMsg = extractBackendMessage(
        (err as { details?: unknown }).details,
        false,
      );

      if (status === 404)
        throw new HttpError(
          404,
          backendMsg ?? 'Session not found. Please reopen your invite link.',
        );
      if (status === 410)
        throw new HttpError(410, 'That invite link has expired.');

      const message =
        backendMsg ?? 'Something went wrong loading your current task.';

      throw new HttpError(
        typeof status === 'number' ? status : fallbackStatus(err, 500),
        message,
      );
    }

    throw toHttpError(err, {
      status: 500,
      message: 'Something went wrong loading your current task.',
    });
  }
}

export async function submitCandidateTask(params: {
  taskId: number;
  token: string;
  candidateSessionId: number;
  contentText?: string;
  codeBlob?: string;
}) {
  const { taskId, token, candidateSessionId, contentText, codeBlob } = params;

  const path = `/tasks/${taskId}/submit`;

  try {
    return await apiClient.post<CandidateTaskSubmitResponse>(
      path,
      {
        ...(typeof contentText === 'string' ? { contentText } : {}),
        ...(typeof codeBlob === 'string' ? { codeBlob } : {}),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-candidate-token': token,
          'x-candidate-session-id': String(candidateSessionId),
        },
        cache: 'no-store',
      },
      clientOptions,
    );
  } catch (err: unknown) {
    if (err instanceof TypeError) {
      throw new HttpError(
        0,
        'Network error. Please check your connection and try again.',
      );
    }

    if (err && typeof err === 'object') {
      const status = (err as { status?: unknown }).status;
      const backendMsg = extractBackendMessage(
        (err as { details?: unknown }).details,
        false,
      );

      if (status === 400)
        throw new HttpError(400, backendMsg ?? 'Task out of order.');
      if (status === 404)
        throw new HttpError(
          404,
          backendMsg ?? 'Session mismatch. Please reopen your invite link.',
        );
      if (status === 409)
        throw new HttpError(409, backendMsg ?? 'Task already submitted.');
      if (status === 410)
        throw new HttpError(410, backendMsg ?? 'That invite link has expired.');

      const message =
        backendMsg ?? 'Something went wrong submitting your task.';

      throw new HttpError(
        typeof status === 'number' ? status : fallbackStatus(err, 500),
        message,
      );
    }

    throw toHttpError(err, {
      status: 500,
      message: 'Something went wrong submitting your task.',
    });
  }
}

export async function submitCandidateCodeTask(params: {
  taskId: number;
  token: string;
  candidateSessionId: number;
  codeBlob: string;
}) {
  return submitCandidateTask({
    taskId: params.taskId,
    token: params.token,
    candidateSessionId: params.candidateSessionId,
    codeBlob: params.codeBlob,
  });
}
