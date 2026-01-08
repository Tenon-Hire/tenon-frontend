import { apiClient, type ApiClientOptions } from './httpClient';
import {
  HttpError,
  extractBackendMessage,
  fallbackStatus,
  toHttpError,
} from './utils/errors';

export { HttpError };

const API_BASE = process.env.NEXT_PUBLIC_TENON_API_BASE_URL ?? '/api/backend';
const baseClientOptions: ApiClientOptions = {
  basePath: API_BASE || '/api/backend',
  skipAuth: false,
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

function toClientOptions(authToken: string): ApiClientOptions {
  return { ...baseClientOptions, authToken };
}

type CandidateSessionResponse = CandidateSessionBootstrapResponse & {
  invitedEmail?: string | null;
  signedInEmail?: string | null;
};

function ensureAuthToken(authToken: string | null | undefined) {
  if (!authToken || !authToken.trim()) {
    throw new HttpError(401, 'Not authenticated. Please sign in again.');
  }
}

function toCandidateSessionId(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return NaN;
}

function toSimulationSummary(value: unknown): SimulationSummary {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { title?: unknown }).title === 'string' &&
    typeof (value as { role?: unknown }).role === 'string'
  ) {
    return value as SimulationSummary;
  }
  return { title: '', role: '' };
}

function parseSessionResponse(
  data: unknown,
  fallbackMessage: string,
): CandidateSessionResponse {
  const candidateSessionId = toCandidateSessionId(
    (data as { candidateSessionId?: unknown })?.candidateSessionId ??
      (data as { candidate_session_id?: unknown })?.candidate_session_id,
  );

  if (!Number.isFinite(candidateSessionId)) {
    throw new HttpError(500, fallbackMessage);
  }

  const status = ((
    data as { status?: CandidateSessionBootstrapResponse['status'] }
  ).status ?? 'in_progress') as CandidateSessionBootstrapResponse['status'];

  const simulation = toSimulationSummary(
    (data as { simulation?: SimulationSummary }).simulation,
  );

  const invitedEmail = (() => {
    const maybe = (data as { invitedEmail?: unknown }).invitedEmail;
    return typeof maybe === 'string' ? maybe : null;
  })();

  const signedInEmail = (() => {
    const maybe = (data as { signedInEmail?: unknown }).signedInEmail;
    return typeof maybe === 'string' ? maybe : null;
  })();

  return {
    candidateSessionId,
    status,
    simulation,
    invitedEmail,
    signedInEmail,
  };
}

export async function claimCandidateInvite(
  inviteToken: string,
  authToken: string,
): Promise<CandidateSessionResponse> {
  const safeInviteToken = inviteToken.trim();
  ensureAuthToken(authToken);

  if (!safeInviteToken) {
    throw new HttpError(400, 'Missing invite token.');
  }

  const path = `/candidate/session/${encodeURIComponent(safeInviteToken)}/claim`;

  try {
    const data = await apiClient.post<CandidateSessionResponse>(
      path,
      undefined,
      { cache: 'no-store' },
      toClientOptions(authToken),
    );

    return parseSessionResponse(
      data,
      'Unable to claim your invite right now. Please try again.',
    );
  } catch (err: unknown) {
    if (err && typeof err === 'object') {
      const status = (err as { status?: unknown }).status;
      const backendMsg = extractBackendMessage(
        (err as { details?: unknown }).details,
        false,
      );

      if (status === 404)
        throw new HttpError(404, 'That invite link is invalid.');
      if (status === 410)
        throw new HttpError(410, 'That invite link has expired.');
      if (status === 401 || status === 403) {
        const invitedEmail = extractBackendMessage(
          (err as { details?: unknown }).details,
          true,
        );
        const message =
          invitedEmail ??
          backendMsg ??
          'This invite was sent to a different email.';
        const error = new HttpError(
          typeof status === 'number' ? status : 403,
          message,
        );
        if (invitedEmail) {
          (error as { invitedEmail?: string }).invitedEmail = invitedEmail;
        }
        throw error;
      }

      const message =
        backendMsg ??
        'Unable to claim your invite right now. Please try again.';

      throw new HttpError(
        typeof status === 'number' ? status : fallbackStatus(err, 500),
        message,
      );
    }

    throw toHttpError(err, {
      status: 500,
      message: 'Unable to claim your invite right now. Please try again.',
    });
  }
}

export type CandidateInvite = {
  candidateSessionId: number;
  token: string | null;
  title: string;
  role: string;
  company: string | null;
  status: CandidateSessionBootstrapResponse['status'] | string;
  progress: { completed: number; total: number } | null;
  expiresAt: string | null;
  lastActivityAt: string | null;
  isExpired: boolean;
};

function normalizeProgress(
  raw: unknown,
): { completed: number; total: number } | null {
  if (raw && typeof raw === 'object') {
    const rec = raw as Record<string, unknown>;
    const completed =
      typeof rec.completed === 'number'
        ? rec.completed
        : typeof rec.completedTasks === 'number'
          ? rec.completedTasks
          : typeof rec.completed_tasks === 'number'
            ? rec.completed_tasks
            : null;
    const total =
      typeof rec.total === 'number'
        ? rec.total
        : typeof rec.totalTasks === 'number'
          ? rec.totalTasks
          : typeof rec.total_tasks === 'number'
            ? rec.total_tasks
            : null;

    if (Number.isFinite(completed) && Number.isFinite(total)) {
      return {
        completed: completed as number,
        total: total as number,
      };
    }
  }
  return null;
}

function toDateString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  return null;
}

export function normalizeCandidateInvite(raw: unknown): CandidateInvite {
  const candidateSessionId = toCandidateSessionId(
    (raw as { candidateSessionId?: unknown })?.candidateSessionId ??
      (raw as { candidate_session_id?: unknown })?.candidate_session_id ??
      (raw as { id?: unknown })?.id,
  );

  const title =
    (raw as { title?: unknown })?.title &&
    typeof (raw as { title?: unknown }).title === 'string'
      ? ((raw as { title: string }).title as string)
      : typeof (raw as { simulationTitle?: unknown }).simulationTitle ===
          'string'
        ? ((raw as { simulationTitle: string }).simulationTitle as string)
        : 'Simulation invite';

  const role =
    (raw as { role?: unknown })?.role &&
    typeof (raw as { role?: unknown }).role === 'string'
      ? ((raw as { role: string }).role as string)
      : typeof (raw as { roleName?: unknown }).roleName === 'string'
        ? ((raw as { roleName: string }).roleName as string)
        : typeof (raw as { role_name?: unknown }).role_name === 'string'
          ? ((raw as { role_name: string }).role_name as string)
          : 'Role pending';

  const companyValue =
    typeof (raw as { company?: unknown })?.company === 'string'
      ? ((raw as { company: string }).company as string)
      : typeof (raw as { companyName?: unknown })?.companyName === 'string'
        ? ((raw as { companyName: string }).companyName as string)
        : typeof (raw as { company_name?: unknown })?.company_name === 'string'
          ? ((raw as { company_name: string }).company_name as string)
          : null;

  const status =
    (raw as { status?: unknown })?.status &&
    typeof (raw as { status?: unknown }).status === 'string'
      ? ((raw as { status: string }).status as CandidateInvite['status'])
      : (raw as { sessionStatus?: unknown })?.sessionStatus &&
          typeof (raw as { sessionStatus?: unknown }).sessionStatus === 'string'
        ? ((raw as { sessionStatus: string })
            .sessionStatus as CandidateInvite['status'])
        : 'in_progress';

  const token =
    (raw as { token?: unknown })?.token &&
    typeof (raw as { token?: unknown }).token === 'string'
      ? ((raw as { token: string }).token as string)
      : typeof (raw as { inviteToken?: unknown })?.inviteToken === 'string'
        ? ((raw as { inviteToken: string }).inviteToken as string)
        : typeof (raw as { invite_token?: unknown })?.invite_token === 'string'
          ? ((raw as { invite_token: string }).invite_token as string)
          : null;

  const progress =
    normalizeProgress((raw as { progress?: unknown })?.progress) ??
    normalizeProgress(
      (raw as { progressSummary?: unknown })?.progressSummary,
    ) ??
    normalizeProgress(
      (raw as { progress_summary?: unknown })?.progress_summary,
    );

  const expiresAt =
    toDateString((raw as { expiresAt?: unknown })?.expiresAt) ??
    toDateString((raw as { expires_at?: unknown })?.expires_at) ??
    toDateString((raw as { expiryDate?: unknown })?.expiryDate) ??
    toDateString((raw as { expiry_date?: unknown })?.expiry_date) ??
    null;

  const lastActivityAt =
    toDateString((raw as { lastActivityAt?: unknown })?.lastActivityAt) ??
    toDateString((raw as { last_activity_at?: unknown })?.last_activity_at) ??
    toDateString((raw as { updatedAt?: unknown })?.updatedAt) ??
    toDateString((raw as { updated_at?: unknown })?.updated_at) ??
    null;

  const isExpired =
    (raw as { isExpired?: unknown })?.isExpired === true ||
    (raw as { is_expired?: unknown })?.is_expired === true ||
    status === 'expired';

  return {
    candidateSessionId: Number.isFinite(candidateSessionId)
      ? (candidateSessionId as number)
      : 0,
    token: token && token.trim() ? token : null,
    title,
    role,
    company: companyValue && companyValue.trim() ? companyValue : null,
    status,
    progress,
    expiresAt,
    lastActivityAt,
    isExpired,
  };
}

export async function listCandidateInvites(
  authToken: string,
): Promise<CandidateInvite[]> {
  ensureAuthToken(authToken);

  try {
    const data = await apiClient.get<unknown>(
      '/candidate/invites',
      { cache: 'no-store' },
      toClientOptions(authToken),
    );

    if (!Array.isArray(data)) return [];
    return data.map(normalizeCandidateInvite);
  } catch (err: unknown) {
    throw toHttpError(err, {
      status: 500,
      message: 'Unable to load your invites right now.',
    });
  }
}

export async function resolveCandidateInviteToken(
  token: string,
  authToken: string,
) {
  ensureAuthToken(authToken);
  const path = `/candidate/session/${encodeURIComponent(token)}`;

  try {
    return await apiClient.get<CandidateSessionBootstrapResponse>(
      path,
      { cache: 'no-store' },
      toClientOptions(authToken),
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
  ensureAuthToken(token);
  const path = `/candidate/session/${candidateSessionId}/current_task`;

  try {
    return await apiClient.get<CandidateCurrentTaskResponse>(
      path,
      {
        headers: {
          'x-candidate-session-id': String(candidateSessionId),
        },
        cache: 'no-store',
      },
      toClientOptions(token),
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

  ensureAuthToken(token);
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
          'x-candidate-session-id': String(candidateSessionId),
        },
        cache: 'no-store',
      },
      toClientOptions(token),
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
