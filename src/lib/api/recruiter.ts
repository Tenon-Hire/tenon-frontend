import { recruiterBffClient, safeRequest } from './httpClient';
import { extractBackendMessage, fallbackStatus } from './utils/errors';
import { getId, getNumber, getString, isRecord } from './utils/normalize';
import type { TemplateKey } from '@/lib/templateCatalog';
import type { CandidateSession } from '@/types/recruiter';

export type SimulationListItem = {
  id: string;
  title: string;
  role: string;
  createdAt: string;
  candidateCount?: number;
  templateKey?: string | null;
};

export type InviteCandidateResponse = {
  candidateSessionId: string;
  token: string;
  inviteUrl: string;
};

export type CreateSimulationInput = {
  title: string;
  role: string;
  techStack: string;
  seniority: 'Junior' | 'Mid' | 'Senior';
  templateKey: TemplateKey;
  focus?: string;
};

export type CreateSimulationResponse = {
  ok: boolean;
  status?: number;
  message?: string;
  id: string;
};

const CANDIDATE_CACHE_TTL_MS = 5000;
const candidateCache = new Map<
  string,
  {
    ts: number;
    data?: CandidateSession[];
    promise?: Promise<CandidateSession[]>;
  }
>();
type ListSimulationsOptions = {
  signal?: AbortSignal;
  cache?: RequestCache;
};
type CreateSimulationOptions = {
  signal?: AbortSignal;
  cache?: RequestCache;
};

function normalizeSimulation(raw: unknown): SimulationListItem {
  if (!isRecord(raw)) {
    return {
      id: '',
      title: 'Untitled simulation',
      role: 'Unknown role',
      createdAt: new Date().toISOString(),
    };
  }

  const id = getId(raw.id ?? raw.simulationId ?? raw.simulation_id);
  const title = getString(
    raw.title ?? raw.simulation_title,
    'Untitled simulation',
  );
  const role = getString(raw.role ?? raw.role_name, 'Unknown role');
  const createdAt = getString(
    raw.createdAt ?? raw.created_at,
    new Date().toISOString(),
  );

  const candidateCount =
    getNumber(raw.candidateCount) ??
    getNumber(raw.candidate_count) ??
    getNumber(raw.numCandidates) ??
    getNumber(raw.num_candidates) ??
    undefined;

  const templateKey =
    typeof raw.templateKey === 'string'
      ? raw.templateKey
      : typeof raw.template_key === 'string'
        ? raw.template_key
        : null;

  return { id, title, role, createdAt, candidateCount, templateKey };
}

export async function listSimulations(
  options?: ListSimulationsOptions,
): Promise<SimulationListItem[]> {
  const data = await recruiterBffClient.get<unknown>(
    '/simulations',
    options ?? undefined,
  );
  if (!Array.isArray(data)) return [];
  return data.map(normalizeSimulation);
}

export async function listSimulationsSafe() {
  return safeRequest<SimulationListItem[]>('/simulations', undefined, {
    basePath: '/api',
    skipAuth: true,
  });
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function normalizeDayProgress(
  raw: unknown,
): { current: number; total: number } | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;

  const current =
    toNumberOrNull(
      rec.current ??
        rec.currentDay ??
        rec.current_day ??
        rec.dayIndex ??
        rec.day_index ??
        rec.day ??
        rec.dayNumber,
    ) ??
    toNumberOrNull(rec.completed ?? rec.completedDays ?? rec.completed_days);

  const total = toNumberOrNull(
    rec.total ??
      rec.totalDays ??
      rec.total_days ??
      rec.totalDayCount ??
      rec.total_day_count,
  );

  if (current === null || total === null) return null;
  return { current, total };
}

function buildInviteUrl(token?: string | null, inviteUrl?: string | null) {
  if (inviteUrl && inviteUrl.trim()) return inviteUrl.trim();
  const safeToken = token?.trim();
  if (!safeToken) return '';
  const path = `/candidate/session/${encodeURIComponent(safeToken)}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export function normalizeCandidateSession(raw: unknown): CandidateSession {
  if (!raw || typeof raw !== 'object') {
    return {
      candidateSessionId: 0,
      inviteEmail: null,
      candidateName: null,
      status: 'not_started',
      startedAt: null,
      completedAt: null,
      hasReport: false,
      verified: null,
      verificationStatus: null,
      verifiedAt: null,
      dayProgress: null,
    };
  }

  const rec = raw as Record<string, unknown>;
  const dayProgress =
    normalizeDayProgress(rec.dayProgress ?? rec.day_progress ?? rec.progress) ??
    normalizeDayProgress(rec.progressSummary ?? rec.progress_summary);

  const inviteToken = toStringOrNull(
    rec.token ?? rec.inviteToken ?? rec.invite_token,
  );
  const inviteUrl = buildInviteUrl(
    inviteToken,
    toStringOrNull(rec.inviteUrl ?? rec.invite_url),
  );

  return {
    candidateSessionId: toNumber(
      rec.candidateSessionId ?? rec.candidate_session_id ?? rec.id,
    ),
    inviteEmail: toStringOrNull(rec.inviteEmail ?? rec.invite_email),
    candidateName: toStringOrNull(rec.candidateName ?? rec.candidate_name),
    status: (typeof rec.status === 'string'
      ? rec.status
      : typeof rec.sessionStatus === 'string'
        ? rec.sessionStatus
        : 'not_started') as CandidateSession['status'],
    startedAt: toStringOrNull(rec.startedAt ?? rec.started_at),
    completedAt: toStringOrNull(rec.completedAt ?? rec.completed_at),
    hasReport: rec.hasReport === true || rec.has_report === true,
    reportReady: rec.reportReady === true || rec.report_ready === true,
    reportId: toStringOrNull(rec.reportId ?? rec.report_id),
    inviteToken,
    inviteUrl: inviteUrl || null,
    inviteEmailStatus: toStringOrNull(
      rec.inviteEmailStatus ?? rec.invite_email_status,
    ),
    inviteEmailSentAt: toStringOrNull(
      rec.inviteEmailSentAt ?? rec.invite_email_sent_at,
    ),
    inviteEmailError: toStringOrNull(
      rec.inviteEmailError ?? rec.invite_email_error,
    ),
    verified:
      typeof rec.verified === 'boolean'
        ? rec.verified
        : typeof rec.isVerified === 'boolean'
          ? rec.isVerified
          : typeof rec.emailVerified === 'boolean'
            ? rec.emailVerified
            : typeof rec.email_verified === 'boolean'
              ? rec.email_verified
              : null,
    verificationStatus: toStringOrNull(
      rec.verificationStatus ??
        rec.verification_status ??
        rec.emailVerificationStatus ??
        rec.email_verification_status,
    ),
    verifiedAt: toStringOrNull(
      rec.verifiedAt ??
        rec.verified_at ??
        rec.verificationCompletedAt ??
        rec.verification_completed_at,
    ),
    dayProgress,
  };
}

function normalizeInviteResponse(raw: unknown): InviteCandidateResponse {
  if (!isRecord(raw)) {
    return { candidateSessionId: '', token: '', inviteUrl: '' };
  }

  const token = getString(raw.token, '');
  const inviteUrl = buildInviteUrl(
    token,
    getString(raw.inviteUrl ?? raw.invite_url, ''),
  );

  return {
    candidateSessionId: getString(
      raw.candidateSessionId ?? raw.candidate_session_id,
      '',
    ),
    token,
    inviteUrl,
  };
}

export async function inviteCandidate(
  simulationId: string,
  candidateName: string,
  inviteEmail: string,
): Promise<InviteCandidateResponse> {
  const safeTrim = (value: unknown) =>
    typeof value === 'string' || typeof value === 'number'
      ? String(value).trim()
      : '';

  const safeId = safeTrim(simulationId);
  const safeName = safeTrim(candidateName);
  const safeEmail = safeTrim(inviteEmail).toLowerCase();

  if (!safeId || !safeName || !safeEmail) {
    return { candidateSessionId: '', token: '', inviteUrl: '' };
  }

  const data = await recruiterBffClient.post<unknown>(
    `/simulations/${safeId}/invite`,
    {
      candidateName: safeName,
      inviteEmail: safeEmail,
    },
  );

  return normalizeInviteResponse(data);
}

export function listSimulationCandidates(
  simulationId: string | number,
): Promise<CandidateSession[]> {
  const safeId = simulationId == null ? '' : String(simulationId).trim();
  if (!safeId) return Promise.resolve([]);

  const now = Date.now();
  const cached = candidateCache.get(safeId);
  if (cached) {
    if (cached.data && now - cached.ts < CANDIDATE_CACHE_TTL_MS) {
      return Promise.resolve(cached.data);
    }
    if (cached.promise) {
      return cached.promise;
    }
  }

  const request = recruiterBffClient
    .get<unknown>(`/simulations/${encodeURIComponent(safeId)}/candidates`)
    .then((data) => {
      const normalized = Array.isArray(data)
        ? data.map(normalizeCandidateSession)
        : [];
      candidateCache.set(safeId, { ts: Date.now(), data: normalized });
      return normalized;
    })
    .catch((error) => {
      candidateCache.delete(safeId);
      throw error;
    });

  candidateCache.set(safeId, { ts: now, promise: request });
  return request;
}

export async function resendInvite(
  simulationId: string | number,
  candidateSessionId: number,
): Promise<unknown> {
  const safeId = simulationId == null ? '' : String(simulationId).trim();
  const safeCandidateId = Number.isFinite(candidateSessionId)
    ? String(candidateSessionId)
    : '';
  if (!safeId || !safeCandidateId) return null;

  return recruiterBffClient.post(
    `/simulations/${encodeURIComponent(
      safeId,
    )}/candidates/${encodeURIComponent(safeCandidateId)}/invite/resend`,
  );
}

function normalizeCreateSimulationResponse(
  raw: unknown,
  status: number,
): CreateSimulationResponse {
  if (!isRecord(raw)) return { ok: false, status, id: '' };
  const id = getId(raw.id ?? raw.simulationId ?? raw.simulation_id);
  const message =
    typeof raw.message === 'string'
      ? raw.message
      : typeof raw.detail === 'string'
        ? raw.detail
        : undefined;
  return {
    ok: status >= 200 && status < 300 && Boolean(id),
    status,
    id,
    message,
  };
}

export async function createSimulation(
  input: CreateSimulationInput,
  options?: CreateSimulationOptions,
): Promise<CreateSimulationResponse> {
  const safeTitle = input.title.trim();
  const safeRole = input.role.trim();
  const safeTechStack = input.techStack.trim();
  const safeTemplateKey = input.templateKey.trim();

  if (!safeTitle || !safeRole || !safeTechStack || !safeTemplateKey) {
    return {
      id: '',
      ok: false,
      status: 400,
      message: 'Missing required fields',
    };
  }

  try {
    const payload = {
      title: safeTitle,
      role: safeRole,
      techStack: safeTechStack,
      seniority: input.seniority,
      templateKey: safeTemplateKey,
      focus: input.focus?.trim() ? input.focus.trim() : undefined,
    };

    const data = await recruiterBffClient.post<unknown>(
      '/simulations',
      payload,
      {
        cache: options?.cache,
        signal: options?.signal,
      },
    );

    const statusFromData =
      typeof data === 'object' && data !== null
        ? (data as { status?: unknown }).status
        : undefined;
    const normalized = normalizeCreateSimulationResponse(
      data,
      typeof statusFromData === 'number' ? statusFromData : 201,
    );
    if (!normalized.ok) {
      const message =
        normalized.message ??
        extractBackendMessage(data, true) ??
        'Unable to create simulation. Please try again shortly.';
      return { ...normalized, message };
    }
    return normalized;
  } catch (caught: unknown) {
    const status = fallbackStatus(caught, 0);
    const message =
      extractBackendMessage(
        (caught as { details?: unknown })?.details ?? caught,
        true,
      ) ??
      (caught instanceof Error ? caught.message : null) ??
      'Unable to create simulation right now.';
    return { ok: false, status, id: '', message };
  }
}
