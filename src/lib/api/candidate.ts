import {
  INVITE_EXPIRED_MESSAGE,
  INVITE_UNAVAILABLE_MESSAGE,
} from '@/lib/copy/invite';
import { apiClient, type ApiClientOptions } from './httpClient';
import {
  HttpError,
  extractBackendMessage,
  fallbackStatus,
  toHttpError,
} from './utils/errors';

export { HttpError };

const RAW_API_BASE =
  process.env.NEXT_PUBLIC_TENON_API_BASE_URL ?? '/api/backend';
const API_BASE = RAW_API_BASE === '/api' ? '/api/backend' : RAW_API_BASE;
const baseClientOptions: ApiClientOptions = {
  basePath: API_BASE || '/api/backend',
  skipAuth: false,
};
const CACHE_TTL_MS = 10_000;

type CacheEntry<T> = {
  expiresAt: number;
  value?: T;
  promise: Promise<T> | null;
};

const candidateCache = new Map<string, CacheEntry<unknown>>();

function cacheNow() {
  return Date.now();
}

function buildCacheKey(
  label: string,
  parts: Record<string, string | number | null | undefined>,
) {
  const sorted = Object.entries(parts)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${String(value)}`)
    .sort()
    .join('|');
  return `${label}:${sorted}`;
}

async function fetchWithCache<T>(
  key: string,
  ttlMs: number,
  skipCache: boolean,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = cacheNow();
  const entry = candidateCache.get(key) as CacheEntry<T> | undefined;
  if (!skipCache && entry) {
    if (entry.value !== undefined && entry.expiresAt > now) {
      return entry.value as T;
    }
    if (entry.promise) {
      return entry.promise;
    }
  }

  const promise = fetcher()
    .then((value) => {
      candidateCache.set(key, {
        value,
        expiresAt: now + ttlMs,
        promise: null,
      });
      return value;
    })
    .catch((err) => {
      const current = candidateCache.get(key) as CacheEntry<T> | undefined;
      if (current?.promise) {
        candidateCache.delete(key);
      }
      throw err;
    });

  candidateCache.set(key, {
    value: entry?.value,
    expiresAt: now + ttlMs,
    promise,
  });

  return promise;
}

function invalidateCache(prefix: string, id?: string | number) {
  const match = typeof id === 'undefined' ? null : String(id);
  for (const key of candidateCache.keys()) {
    if (!key.startsWith(prefix)) continue;
    if (match && !key.includes(match)) continue;
    candidateCache.delete(key);
  }
}

function clearCandidateTaskCache(candidateSessionId: number) {
  invalidateCache('candidate-task', candidateSessionId);
}

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

export type CandidateWorkspaceStatus = {
  repoUrl: string | null;
  repoName: string | null;
  repoFullName: string | null;
  codespaceUrl: string | null;
};

export type CandidateTestRunStartResponse = {
  runId: string;
};

export type CandidateTestRunStatusResponse = {
  status: 'running' | 'passed' | 'failed' | 'timeout' | 'error';
  message?: string;
  passed: number | null;
  failed: number | null;
  total: number | null;
  stdout: string | null;
  stderr: string | null;
  workflowUrl: string | null;
  commitSha: string | null;
};

function toClientOptions(authToken: string): ApiClientOptions {
  return { ...baseClientOptions, authToken };
}

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

function toStringOrNull(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  return null;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

type CandidateTestRunDetails = Pick<
  CandidateTestRunStatusResponse,
  | 'passed'
  | 'failed'
  | 'total'
  | 'stdout'
  | 'stderr'
  | 'workflowUrl'
  | 'commitSha'
>;

function resolveRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function normalizeRunDetails(
  rec: Record<string, unknown>,
): CandidateTestRunDetails {
  const summary =
    resolveRecord(rec.summary) ??
    resolveRecord(rec.testSummary) ??
    resolveRecord(rec.test_summary);
  const sources = [rec, summary].filter(Boolean) as Record<string, unknown>[];

  const pickValue = (keys: string[]) => {
    for (const source of sources) {
      for (const key of keys) {
        if (key in source) return source[key];
      }
    }
    return undefined;
  };

  const passed = toNumberOrNull(
    pickValue([
      'passed',
      'passedTests',
      'passed_tests',
      'testsPassed',
      'tests_passed',
    ]),
  );
  const failed = toNumberOrNull(
    pickValue([
      'failed',
      'failedTests',
      'failed_tests',
      'testsFailed',
      'tests_failed',
    ]),
  );
  let total = toNumberOrNull(
    pickValue([
      'total',
      'totalTests',
      'total_tests',
      'testsTotal',
      'tests_total',
    ]),
  );

  if (total === null && passed !== null && failed !== null) {
    total = passed + failed;
  }

  const stdout = toStringOrNull(
    pickValue([
      'stdout',
      'std_out',
      'testStdout',
      'test_stdout',
      'output',
      'logs',
    ]),
  );
  const stderr = toStringOrNull(
    pickValue([
      'stderr',
      'std_err',
      'testStderr',
      'test_stderr',
      'error_output',
      'errorOutput',
    ]),
  );
  const workflowUrl = toStringOrNull(
    pickValue([
      'workflowUrl',
      'workflow_url',
      'workflowRunUrl',
      'workflow_run_url',
      'runUrl',
      'run_url',
      'actionsUrl',
      'actions_url',
    ]),
  );
  const commitSha = toStringOrNull(
    pickValue([
      'commitSha',
      'commit_sha',
      'sha',
      'commit',
      'commitId',
      'commit_id',
    ]),
  );

  return { passed, failed, total, stdout, stderr, workflowUrl, commitSha };
}

function toIdString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

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

function normalizeRunStatus(data: unknown): CandidateTestRunStatusResponse {
  if (!data || typeof data !== 'object') {
    return {
      status: 'error',
      passed: null,
      failed: null,
      total: null,
      stdout: null,
      stderr: null,
      workflowUrl: null,
      commitSha: null,
    };
  }
  const rec = data as Record<string, unknown>;
  const details = normalizeRunDetails(rec);
  const rawStatus = rec.status ?? '';
  const rawConclusion = rec.conclusion ?? '';
  const status = String(rawStatus).toLowerCase();
  const conclusion = String(rawConclusion).toLowerCase();
  const timeout =
    rec.timeout === true ||
    status === 'timed_out' ||
    conclusion === 'timed_out';

  if (timeout) {
    return {
      status: 'timeout',
      message: toStringOrNull(rec.message) ?? undefined,
      ...details,
    };
  }
  if (status === 'running' || status === 'in_progress' || status === 'queued') {
    return {
      status: 'running',
      message: toStringOrNull(rec.message) ?? undefined,
      ...details,
    };
  }
  if (conclusion === 'success' || status === 'passed' || status === 'success') {
    return {
      status: 'passed',
      message: toStringOrNull(rec.message) ?? undefined,
      ...details,
    };
  }
  if (conclusion === 'failure' || status === 'failed' || status === 'failure') {
    return {
      status: 'failed',
      message: toStringOrNull(rec.message) ?? undefined,
      ...details,
    };
  }
  if (status === 'completed') {
    if (conclusion === 'success')
      return {
        status: 'passed',
        message: toStringOrNull(rec.message) ?? undefined,
        ...details,
      };
    if (conclusion === 'failure')
      return {
        status: 'failed',
        message: toStringOrNull(rec.message) ?? undefined,
        ...details,
      };
    if (conclusion === 'timed_out')
      return {
        status: 'timeout',
        message: toStringOrNull(rec.message) ?? undefined,
        ...details,
      };
  }

  return {
    status: 'error',
    message: toStringOrNull(rec.message) ?? undefined,
    ...details,
  };
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
  options?: { skipCache?: boolean },
) {
  ensureAuthToken(authToken);
  const path = `/candidate/session/${encodeURIComponent(token)}`;
  const skipCache = options?.skipCache === true;
  const cacheKey = buildCacheKey('candidate-bootstrap', { token });

  return fetchWithCache(cacheKey, CACHE_TTL_MS, skipCache, async () => {
    try {
      return await apiClient.get<CandidateSessionBootstrapResponse>(
        path,
        { cache: 'no-store' },
        toClientOptions(authToken),
      );
    } catch (err: unknown) {
      if (err && typeof err === 'object') {
        const status = (err as { status?: unknown }).status;
        const details = (err as { details?: unknown }).details;
        const backendMsg = extractBackendMessage(details, true) ?? '';
        const lowerMsg = backendMsg.toLowerCase();

        if (status === 400 || status === 404 || status === 409)
          throw new HttpError(status, INVITE_UNAVAILABLE_MESSAGE);
        if (status === 401) throw new HttpError(401, 'Please sign in again.');
        if (status === 403) {
          if (
            lowerMsg.includes('verify') ||
            lowerMsg.includes('email verification') ||
            lowerMsg.includes('email_verified')
          ) {
            throw new HttpError(
              403,
              'Please verify your email, then try again.',
            );
          }
          if (lowerMsg.includes('email claim') || lowerMsg.includes('email')) {
            throw new HttpError(
              403,
              'We could not confirm your email. Please sign in again.',
            );
          }
          throw new HttpError(403, 'You do not have access to this invite.');
        }
        if (status === 410) throw new HttpError(410, INVITE_EXPIRED_MESSAGE);

        const fallbackMsg =
          extractBackendMessage(details, false) ?? backendMsg ?? '';

        const safeStatus =
          typeof status === 'number' ? status : fallbackStatus(err, 500);

        throw new HttpError(
          safeStatus,
          fallbackMsg.trim() || 'Something went wrong loading your simulation.',
        );
      }

      throw toHttpError(err, {
        status: 500,
        message: 'Something went wrong loading your simulation.',
      });
    }
  });
}

export async function getCandidateCurrentTask(
  candidateSessionId: number,
  token: string,
  options?: { skipCache?: boolean },
) {
  ensureAuthToken(token);
  const path = `/candidate/session/${candidateSessionId}/current_task`;
  const skipCache = options?.skipCache === true;
  const tokenTail =
    typeof token === 'string' && token.length > 12
      ? token.slice(-12)
      : (token ?? 'missing');
  const cacheKey = buildCacheKey('candidate-task', {
    candidateSessionId,
    token: tokenTail,
  });

  return fetchWithCache(cacheKey, CACHE_TTL_MS, skipCache, async () => {
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
  });
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
    const data = await apiClient.post<unknown>(
      path,
      {},
      {
        headers: {
          'x-candidate-session-id': String(candidateSessionId),
        },
        cache: 'no-store',
      },
      toClientOptions(token),
    );
    return normalizeWorkspaceStatus(data);
  } catch (err: unknown) {
    if (err instanceof TypeError) {
      throw new HttpError(
        0,
        'Network error. Please check your connection and try again.',
      );
    }
    throw toHttpError(err, {
      status: 500,
      message: 'Unable to load your workspace right now.',
    });
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
    const data = await apiClient.get<unknown>(
      path,
      {
        headers: {
          'x-candidate-session-id': String(candidateSessionId),
        },
        cache: 'no-store',
      },
      toClientOptions(token),
    );
    return normalizeWorkspaceStatus(data);
  } catch (err: unknown) {
    if (err instanceof TypeError) {
      throw new HttpError(
        0,
        'Network error. Please check your connection and try again.',
      );
    }
    throw toHttpError(err, {
      status: 500,
      message: 'Unable to load your workspace right now.',
    });
  }
}

export async function startCandidateTestRun(params: {
  taskId: number;
  token: string;
  candidateSessionId: number;
}): Promise<CandidateTestRunStartResponse> {
  const { taskId, token, candidateSessionId } = params;
  ensureAuthToken(token);
  const path = `/tasks/${taskId}/run`;

  try {
    const data = await apiClient.post<unknown>(
      path,
      {},
      {
        headers: {
          'x-candidate-session-id': String(candidateSessionId),
        },
        cache: 'no-store',
      },
      toClientOptions(token),
    );

    if (data && typeof data === 'object') {
      const rec = data as Record<string, unknown>;
      const runId = toIdString(rec.runId ?? rec.run_id ?? rec.id);
      if (runId) return { runId };
    }
    throw new HttpError(500, 'Missing run id from test run.');
  } catch (err: unknown) {
    if (err instanceof TypeError) {
      throw new HttpError(
        0,
        'Network error. Please check your connection and try again.',
      );
    }
    throw toHttpError(err, {
      status: 500,
      message: 'Unable to start tests right now.',
    });
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
    const data = await apiClient.get<unknown>(
      path,
      {
        headers: {
          'x-candidate-session-id': String(candidateSessionId),
        },
        cache: 'no-store',
      },
      toClientOptions(token),
    );
    return normalizeRunStatus(data);
  } catch (err: unknown) {
    if (err instanceof TypeError) {
      throw new HttpError(
        0,
        'Network error. Please check your connection and try again.',
      );
    }
    throw toHttpError(err, {
      status: 500,
      message: 'Unable to check test status right now.',
    });
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
    const response = await apiClient.post<CandidateTaskSubmitResponse>(
      path,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-candidate-session-id': String(candidateSessionId),
        },
        cache: 'no-store',
      },
      toClientOptions(token),
    );
    clearCandidateTaskCache(candidateSessionId);
    return response;
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
