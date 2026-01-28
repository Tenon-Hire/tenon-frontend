'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PageHeader from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { CandidateStatusPill } from '@/features/recruiter/components/CandidateStatusPill';
import { useInviteCandidateFlow } from '@/features/recruiter/dashboard/hooks/useInviteCandidateFlow';
import { InviteCandidateModal } from '@/features/recruiter/invitations/InviteCandidateModal';
import { useNotifications } from '@/features/shared/notifications';
import {
  copyToClipboard,
  errorToMessage,
} from '@/features/recruiter/utils/formatters';
import { normalizeCandidateSession } from '@/lib/api/recruiter';
import {
  buildLoginUrl,
  buildNotAuthorizedUrl,
  buildReturnTo,
} from '@/lib/auth/routing';
import { Skeleton } from '@/components/ui/Skeleton';
import { toUserMessage } from '@/lib/utils/errors';
import type { CandidateSession } from '@/types/recruiter';

type RowState = {
  resending?: boolean;
  copied?: boolean;
  error?: string | null;
  message?: string | null;
  cooldownUntilMs?: number | null;
  manualCopyUrl?: string | null;
  manualCopyOpen?: boolean;
};

type SimulationPlanDay = {
  dayIndex: number;
  title: string;
  type: string | null;
  prompt: string | null;
  rubricItems: string[];
  rubricText: string | null;
  repoUrl: string | null;
  repoName: string | null;
  codespaceUrl: string | null;
  provisioned: boolean | null;
};

type SimulationPlan = {
  title: string | null;
  templateKey: string | null;
  role: string | null;
  techStack: string | null;
  focus: string | null;
  scenario: string | null;
  days: SimulationPlanDay[];
};

type DerivedStatus = 'completed' | 'in_progress' | 'not_started';

const candidateKey = (id: CandidateSession['candidateSessionId']) => String(id);

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function inviteStatusLabel(
  status: CandidateSession['inviteEmailStatus'],
): string {
  if (!status) return 'Not sent';
  const normalized = String(status).toLowerCase();
  if (normalized === 'sent') return 'Email sent';
  if (normalized === 'failed') return 'Delivery failed';
  if (normalized === 'rate_limited') return 'Rate limited';
  return String(status).replace(/_/g, ' ');
}

function verificationStatusLabel(candidate: CandidateSession): string {
  if (candidate.verified === true) return 'Verified';
  if (candidate.verificationStatus) {
    const normalized = String(candidate.verificationStatus).toLowerCase();
    if (normalized === 'verified') return 'Verified';
    if (normalized === 'pending') return 'Pending';
    if (normalized === 'required') return 'Required';
    if (normalized === 'failed') return 'Failed';
    return String(candidate.verificationStatus).replace(/_/g, ' ');
  }
  if (candidate.verified === false) return 'Not verified';
  return 'Not verified';
}

function formatDayProgress(
  progress: CandidateSession['dayProgress'],
): string | null {
  if (!progress) return null;
  const current = Math.max(0, Math.round(progress.current));
  const total = Math.max(0, Math.round(progress.total));
  if (!total) return null;
  return `${current} / ${total}`;
}

function formatCooldown(remainingMs: number): string {
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
  return `Retry in ${seconds}s`;
}

function deriveStatus(candidate: CandidateSession): DerivedStatus {
  if (candidate.completedAt) return 'completed';
  if (candidate.startedAt) return 'in_progress';
  return 'not_started';
}

function toTimestamp(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toStringOrCsv(value: unknown): string | null {
  if (typeof value === 'string') return toStringOrNull(value);
  if (Array.isArray(value)) {
    const items = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
    return items.length ? items.join(', ') : null;
  }
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

function toBooleanOrNull(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return null;
}

function parseDayIndex(value: unknown, fallback?: number | null): number {
  const fromValue = toNumberOrNull(value);
  if (fromValue !== null) return Math.max(0, Math.round(fromValue));
  if (typeof value === 'string') {
    const match = value.match(/(\d+)/);
    if (match) {
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed));
    }
  }
  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return Math.max(0, Math.round(fallback));
  }
  return 0;
}

function normalizeRubric(raw: unknown): {
  rubricItems: string[];
  rubricText: string | null;
} {
  if (!raw) return { rubricItems: [], rubricText: null };
  if (Array.isArray(raw)) {
    const rubricItems = raw
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (!item || typeof item !== 'object') return null;
        const rec = item as Record<string, unknown>;
        return (
          toStringOrNull(
            rec.text ??
              rec.title ??
              rec.criteria ??
              rec.description ??
              rec.summary,
          ) ?? null
        );
      })
      .filter((item): item is string => Boolean(item));
    return { rubricItems, rubricText: null };
  }
  if (typeof raw === 'string') {
    return { rubricItems: [], rubricText: raw.trim() || null };
  }
  if (raw && typeof raw === 'object') {
    const rec = raw as Record<string, unknown>;
    const text =
      toStringOrNull(
        rec.text ??
          rec.summary ??
          rec.description ??
          rec.criteria ??
          rec.details,
      ) ?? null;
    return { rubricItems: [], rubricText: text };
  }
  return { rubricItems: [], rubricText: null };
}

function normalizeSimulationPlanDay(
  raw: unknown,
  fallbackDayIndex?: number | null,
): SimulationPlanDay | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const dayIndex = parseDayIndex(
    rec.dayIndex ??
      rec.day_index ??
      rec.dayNumber ??
      rec.day_number ??
      rec.day ??
      rec.order ??
      rec.sequence,
    fallbackDayIndex ?? null,
  );

  const title =
    toStringOrNull(rec.title ?? rec.name ?? rec.taskTitle ?? rec.summary) ??
    (dayIndex ? `Day ${dayIndex}` : 'Task');

  const prompt = toStringOrNull(
    rec.prompt ??
      rec.description ??
      rec.instructions ??
      rec.task ??
      rec.taskPrompt ??
      rec.problem,
  );

  const { rubricItems, rubricText } = normalizeRubric(
    rec.rubric ??
      rec.rubrics ??
      rec.criteria ??
      rec.evaluation ??
      rec.grading ??
      rec.assessment,
  );

  const repoUrl = toStringOrNull(
    rec.repoUrl ??
      rec.repo_url ??
      rec.repoHtmlUrl ??
      rec.repo_html_url ??
      rec.repositoryUrl ??
      rec.repository_url ??
      rec.repoLink ??
      rec.repo_link,
  );
  const repoName = toStringOrNull(
    rec.repoFullName ??
      rec.repo_full_name ??
      rec.repositoryFullName ??
      rec.repository_full_name ??
      rec.repoName ??
      rec.repo_name,
  );
  const codespaceUrl = toStringOrNull(
    rec.codespaceUrl ??
      rec.codespace_url ??
      rec.workspaceUrl ??
      rec.workspace_url,
  );

  const provisioned = toBooleanOrNull(
    rec.repoProvisioned ??
      rec.repo_provisioned ??
      rec.isProvisioned ??
      rec.is_provisioned ??
      rec.preProvisioned ??
      rec.pre_provisioned ??
      rec.workspaceReady ??
      rec.workspace_ready,
  );

  return {
    dayIndex,
    title,
    type: toStringOrNull(rec.type ?? rec.taskType ?? rec.task_type ?? rec.kind),
    prompt,
    rubricItems,
    rubricText,
    repoUrl,
    repoName,
    codespaceUrl,
    provisioned,
  };
}

function extractDayTasks(raw: Record<string, unknown>): SimulationPlanDay[] {
  const taskSources: unknown[] = [
    raw.tasks,
    raw.taskPlan,
    raw.task_plan,
    raw.dayPlan,
    raw.day_plan,
    raw.days,
    raw.plan,
    raw.simulationPlan,
    raw.simulation_plan,
    raw.generatedPlan,
    raw.generated_plan,
    raw.generatedScenario,
    raw.generated_scenario,
    raw.scenario,
  ];

  let taskContainer: unknown = null;
  for (const source of taskSources) {
    if (Array.isArray(source)) {
      taskContainer = source;
      break;
    }
    if (source && typeof source === 'object') {
      const record = source as Record<string, unknown>;
      const nested = record.tasks ?? record.days ?? record.plan;
      if (Array.isArray(nested) || (nested && typeof nested === 'object')) {
        taskContainer = nested;
        break;
      }
      taskContainer = source;
      break;
    }
  }

  if (!taskContainer) return [];

  if (Array.isArray(taskContainer)) {
    return taskContainer
      .map((entry, index) => normalizeSimulationPlanDay(entry, index + 1))
      .filter((entry): entry is SimulationPlanDay => Boolean(entry));
  }

  if (taskContainer && typeof taskContainer === 'object') {
    const entries = Object.entries(taskContainer as Record<string, unknown>);
    return entries
      .map(([key, value], index) => {
        const dayIndex = parseDayIndex(key, index + 1);
        return normalizeSimulationPlanDay(value, dayIndex);
      })
      .filter((entry): entry is SimulationPlanDay => Boolean(entry));
  }

  return [];
}

function normalizeSimulationPlan(raw: unknown): SimulationPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const scenarioRaw =
    rec.scenario ??
    rec.scenarioSummary ??
    rec.scenario_summary ??
    rec.overview ??
    rec.summary ??
    rec.simulationScenario ??
    rec.simulation_scenario;

  const scenario =
    toStringOrNull(scenarioRaw) ??
    (scenarioRaw && typeof scenarioRaw === 'object'
      ? toStringOrNull(
          (scenarioRaw as Record<string, unknown>).summary ??
            (scenarioRaw as Record<string, unknown>).overview ??
            (scenarioRaw as Record<string, unknown>).description,
        )
      : null);

  return {
    title: toStringOrNull(rec.title ?? rec.simulation_title ?? rec.name),
    templateKey: toStringOrNull(rec.templateKey ?? rec.template_key),
    role: toStringOrCsv(rec.role ?? rec.role_name ?? rec.roleName),
    techStack: toStringOrCsv(
      rec.techStack ?? rec.tech_stack ?? rec.stack ?? rec.stack_name,
    ),
    focus: toStringOrCsv(rec.focus ?? rec.focus_area ?? rec.focusArea),
    scenario,
    days: extractDayTasks(rec).sort((a, b) => a.dayIndex - b.dayIndex),
  };
}

async function safeParseResponse(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') ?? '';
  const clone = typeof res.clone === 'function' ? res.clone() : null;

  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      if (!clone) return null;
      try {
        return await clone.text();
      } catch {
        return null;
      }
    }
  }

  try {
    return await res.text();
  } catch {
    if (!clone) return null;
    try {
      return await clone.text();
    } catch {
      return null;
    }
  }
}

export const __testables = {
  formatDateTime,
  inviteStatusLabel,
  verificationStatusLabel,
  formatDayProgress,
  formatCooldown,
  deriveStatus,
  toTimestamp,
  toStringOrNull,
  toStringOrCsv,
  toNumberOrNull,
  toBooleanOrNull,
  parseDayIndex,
  normalizeRubric,
  normalizeSimulationPlanDay,
  extractDayTasks,
  normalizeSimulationPlan,
  safeParseResponse,
};

export default function RecruiterSimulationDetailPage() {
  const params = useParams<{ id: string }>();
  const simulationId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [simulationTemplateKey, setSimulationTemplateKey] = useState<
    string | null
  >(null);
  const [simulationTitle, setSimulationTitle] = useState<string | null>(null);
  const [simulationPlan, setSimulationPlan] = useState<SimulationPlan | null>(
    null,
  );
  const [planLoading, setPlanLoading] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [cooldownTick, setCooldownTick] = useState(0);
  const { notify, update } = useNotifications();
  const copyTimersRef = useRef<Record<string, number>>({});

  const mountedRef = useRef(true);
  const cooldownTimersRef = useRef<Record<string, number>>({});
  const cooldownIntervalRef = useRef<number | null>(null);

  const inviteFlow = useInviteCandidateFlow(
    inviteModalOpen
      ? {
          open: true,
          simulationId,
          simulationTitle: `Simulation ${simulationId}`,
        }
      : null,
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      Object.values(cooldownTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      cooldownTimersRef.current = {};
      if (cooldownIntervalRef.current) {
        window.clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
      Object.values(copyTimersRef.current).forEach((timerId) =>
        window.clearTimeout(timerId),
      );
      copyTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    setCandidates([]);
    setRowStates({});
    setError(null);
    setSimulationTemplateKey(null);
    setSimulationTitle(null);
    setSimulationPlan(null);
    setPlanLoading(true);
    setPlanError(null);
    setPage(1);
  }, [simulationId]);

  useEffect(() => {
    const hasCooldown = Object.values(rowStates).some(
      (row) =>
        typeof row.cooldownUntilMs === 'number' &&
        row.cooldownUntilMs > Date.now(),
    );

    if (hasCooldown && !cooldownIntervalRef.current) {
      cooldownIntervalRef.current = window.setInterval(() => {
        setCooldownTick(Date.now());
      }, 1000);
    }

    if (!hasCooldown && cooldownIntervalRef.current) {
      window.clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
  }, [rowStates]);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/simulations/${simulationId}/candidates`, {
        method: 'GET',
        cache: 'no-store',
      });

      const parsed = await safeParseResponse(res);

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Session expired. Please sign in again.');
        }
        if (res.status === 403) {
          throw new Error('You are not authorized to view candidates.');
        }
        const msg = toUserMessage(parsed, 'Request failed', {
          includeDetail: true,
        });
        throw new Error(msg || `Failed to load candidates (${res.status})`);
      }

      const data = Array.isArray(parsed) ? parsed : [];
      if (mountedRef.current) {
        setCandidates(data.map(normalizeCandidateSession));
      }
    } catch (e: unknown) {
      if (mountedRef.current)
        setError(toUserMessage(e, 'Request failed', { includeDetail: true }));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [simulationId]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const loadSimulationDetail = useCallback(async () => {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const res = await fetch(`/api/simulations/${simulationId}`, {
        method: 'GET',
        cache: 'no-store',
      });
      const parsed = await safeParseResponse(res);

      if (!res.ok) {
        const status = res.status;
        const returnTo = buildReturnTo();

        if (status === 401) {
          window.location.assign(buildLoginUrl('recruiter', returnTo));
          return;
        }

        if (status === 403) {
          window.location.assign(buildNotAuthorizedUrl('recruiter', returnTo));
          return;
        }

        throw new Error(
          toUserMessage(parsed, 'Failed to load simulation details.', {
            includeDetail: true,
          }),
        );
      }

      const detail = normalizeSimulationPlan(parsed);
      if (mountedRef.current) {
        setSimulationPlan(detail);
        if (detail?.templateKey) setSimulationTemplateKey(detail.templateKey);
        if (detail?.title) setSimulationTitle(detail.title);
      }
    } catch (caught: unknown) {
      if (mountedRef.current) {
        setPlanError(
          toUserMessage(caught, 'Failed to load simulation details.', {
            includeDetail: true,
          }),
        );
        setSimulationPlan(null);
      }
    } finally {
      if (mountedRef.current) setPlanLoading(false);
    }
  }, [simulationId]);

  const loadSimulationMeta = useCallback(async () => {
    try {
      const res = await fetch('/api/simulations', {
        method: 'GET',
        cache: 'no-store',
      });
      const parsed = await safeParseResponse(res);

      if (!res.ok) {
        const status = res.status;
        const returnTo = buildReturnTo();

        if (status === 401) {
          window.location.assign(buildLoginUrl('recruiter', returnTo));
          return;
        }

        if (status === 403) {
          window.location.assign(buildNotAuthorizedUrl('recruiter', returnTo));
          return;
        }

        throw new Error(
          toUserMessage(parsed, 'Failed to load simulation details.', {
            includeDetail: true,
          }),
        );
      }

      const items = Array.isArray(parsed) ? parsed : [];
      const match = items.find((item) => {
        if (!item || typeof item !== 'object') return false;
        const record = item as Record<string, unknown>;
        const id =
          record.id ?? record.simulationId ?? record.simulation_id ?? '';
        return String(id) === String(simulationId);
      }) as Record<string, unknown> | undefined;

      const templateKey =
        typeof match?.templateKey === 'string'
          ? match.templateKey
          : typeof match?.template_key === 'string'
            ? match.template_key
            : null;
      const title =
        typeof match?.title === 'string'
          ? match.title
          : typeof match?.simulation_title === 'string'
            ? match.simulation_title
            : null;

      if (mountedRef.current) {
        setSimulationTemplateKey(templateKey);
        setSimulationTitle(title);
      }
    } catch {
      if (mountedRef.current) {
        setSimulationTemplateKey(null);
        setSimulationTitle(null);
      }
    }
  }, [simulationId]);

  useEffect(() => {
    void loadSimulationMeta();
  }, [loadSimulationMeta]);

  useEffect(() => {
    void loadSimulationDetail();
  }, [loadSimulationDetail]);

  const visibleCandidates = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = normalizedQuery
      ? candidates.filter((candidate) => {
          const name = candidate.candidateName?.toLowerCase() ?? '';
          const email = candidate.inviteEmail?.toLowerCase() ?? '';
          return (
            name.includes(normalizedQuery) || email.includes(normalizedQuery)
          );
        })
      : candidates;

    const statusRank = (status: DerivedStatus) => {
      if (status === 'completed') return 0;
      if (status === 'in_progress') return 1;
      return 2;
    };

    return [...filtered].sort((a, b) => {
      const aStatus = deriveStatus(a);
      const bStatus = deriveStatus(b);
      const rankDelta = statusRank(aStatus) - statusRank(bStatus);
      if (rankDelta !== 0) return rankDelta;
      if (aStatus === 'completed') {
        const delta = toTimestamp(b.completedAt) - toTimestamp(a.completedAt);
        if (delta !== 0) return delta;
      }
      if (aStatus === 'in_progress') {
        const delta = toTimestamp(b.startedAt) - toTimestamp(a.startedAt);
        if (delta !== 0) return delta;
      }
      if (aStatus === 'not_started') {
        const aEmail = (a.inviteEmail ?? '').toLowerCase();
        const bEmail = (b.inviteEmail ?? '').toLowerCase();
        if (aEmail !== bEmail) return aEmail.localeCompare(bEmail);
      }
      return String(a.candidateSessionId).localeCompare(
        String(b.candidateSessionId),
      );
    });
  }, [candidates, searchQuery]);

  const pageSize = 25;
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(visibleCandidates.length / pageSize)),
    [pageSize, visibleCandidates.length],
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, candidates.length]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const pagedCandidates = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return visibleCandidates.slice(start, end);
  }, [page, pageSize, visibleCandidates]);

  const updateRowState = useCallback(
    (
      candidateSessionId: string,
      updater: RowState | ((prev: RowState) => RowState),
    ) => {
      setRowStates((prev) => {
        const current = prev[candidateSessionId] ?? {};
        const next =
          typeof updater === 'function'
            ? (updater as (prev: RowState) => RowState)(current)
            : updater;
        return { ...prev, [candidateSessionId]: next };
      });
    },
    [],
  );

  const handleCopy = useCallback(
    async (candidate: CandidateSession) => {
      const link = candidate.inviteUrl?.trim() || null;
      const id = candidateKey(candidate.candidateSessionId);
      if (!link) {
        updateRowState(id, (prev) => ({
          ...prev,
          copied: false,
          message: null,
          error: 'Invite link unavailable — resend invite or refresh.',
          manualCopyOpen: false,
          manualCopyUrl: null,
        }));
        return;
      }

      const ok = await copyToClipboard(link);
      if (!mountedRef.current) return;

      updateRowState(id, (prev) => ({
        ...prev,
        copied: ok,
        error: ok ? null : 'Unable to copy invite link.',
        message: ok ? 'Invite link copied' : null,
        manualCopyOpen: ok ? false : true,
        manualCopyUrl: ok ? null : link,
      }));

      if (ok) {
        notify({
          id: `invite-copy-${id}`,
          tone: 'success',
          title: 'Invite link copied',
          description: 'Share the link with the candidate.',
        });
      } else {
        notify({
          id: `invite-copy-error-${id}`,
          tone: 'error',
          title: 'Unable to copy invite link',
          description: 'Use the manual copy option instead.',
        });
      }

      window.setTimeout(() => {
        if (!mountedRef.current) return;
        updateRowState(id, (prev) => ({
          ...prev,
          copied: false,
          message: null,
        }));
      }, 1800);
    },
    [notify, updateRowState],
  );

  const handleResend = useCallback(
    async (candidate: CandidateSession): Promise<boolean> => {
      const id = candidateKey(candidate.candidateSessionId);
      const startCooldown = (seconds?: number | null) => {
        const cooldownSeconds =
          typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0
            ? seconds
            : 30;
        const cooldownMs = cooldownSeconds * 1000;
        updateRowState(id, (prev) => ({
          ...prev,
          resending: false,
          message: null,
          cooldownUntilMs: Date.now() + cooldownMs,
        }));
        if (cooldownTimersRef.current[id])
          window.clearTimeout(cooldownTimersRef.current[id]);
        cooldownTimersRef.current[id] = window.setTimeout(() => {
          updateRowState(id, (prev) => ({
            ...prev,
            cooldownUntilMs: null,
            message: prev.message,
          }));
          delete cooldownTimersRef.current[id];
        }, cooldownMs);
      };

      updateRowState(id, (prev) => ({
        ...prev,
        resending: true,
        error: null,
        message: null,
        cooldownUntilMs: prev.cooldownUntilMs ?? null,
      }));

      try {
        const res = await fetch(
          `/api/simulations/${simulationId}/candidates/${id}/invite/resend`,
          { method: 'POST', cache: 'no-store' },
        );

        const parsed = await safeParseResponse(res);

        const retryAfterHeader = res.headers.get('retry-after');
        const retryAfterSeconds =
          retryAfterHeader && /^\d+$/.test(retryAfterHeader)
            ? Number(retryAfterHeader)
            : parsed && typeof parsed === 'object'
              ? Number(
                  (parsed as { retryAfterSeconds?: unknown })
                    .retryAfterSeconds ??
                    (parsed as { retry_after_seconds?: unknown })
                      .retry_after_seconds ??
                    (parsed as { cooldownSeconds?: unknown }).cooldownSeconds ??
                    (parsed as { cooldown_seconds?: unknown }).cooldown_seconds,
                )
              : null;

        const rateLimited =
          res.status === 429 ||
          (parsed &&
            typeof parsed === 'object' &&
            (parsed as { inviteEmailStatus?: unknown }).inviteEmailStatus ===
              'rate_limited');

        const notFound =
          res.status === 404 ||
          (parsed &&
            typeof parsed === 'object' &&
            /not\s+found/i.test(
              String(
                (parsed as { message?: unknown }).message ??
                  (parsed as { detail?: unknown }).detail ??
                  '',
              ),
            ));

        if (notFound) {
          updateRowState(id, (prev) => ({
            ...prev,
            resending: false,
            error: 'Candidate not found — refreshing list.',
          }));
          void loadCandidates();
          return false;
        }

        if (!res.ok) {
          if (rateLimited) {
            startCooldown(
              Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null,
            );
            return false;
          }
          const msg = toUserMessage(parsed, 'Unable to resend invite.', {
            includeDetail: true,
          });
          throw new Error(msg || `Unable to resend invite (${res.status})`);
        }

        if (parsed && typeof parsed === 'object') {
          const normalized = normalizeCandidateSession(parsed);
          setCandidates((prev) =>
            prev.map((c) =>
              candidateKey(c.candidateSessionId) === id
                ? { ...c, ...normalized }
                : c,
            ),
          );
        } else {
          void loadCandidates();
        }

        if (rateLimited) {
          startCooldown(
            Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null,
          );
        } else {
          updateRowState(id, (prev) => ({
            ...prev,
            resending: false,
            message: inviteStatusLabel(
              (parsed as CandidateSession | null)?.inviteEmailStatus ?? 'sent',
            ),
            cooldownUntilMs: prev.cooldownUntilMs ?? null,
          }));
          notify({
            id: `invite-resent-${id}`,
            tone: 'success',
            title: 'Invite resent',
            description: 'A fresh invite email is on the way.',
          });
        }
        return !rateLimited;
      } catch (e: unknown) {
        if (!mountedRef.current) return false;
        updateRowState(id, (prev) => ({
          ...prev,
          resending: false,
          error: errorToMessage(e, 'Unable to resend invite.'),
        }));
        notify({
          id: `invite-resend-error-${id}`,
          tone: 'error',
          title: 'Unable to resend invite',
          description: errorToMessage(e, 'Please try again.'),
        });
        return false;
      }
    },
    [loadCandidates, notify, simulationId, updateRowState],
  );

  const inviteLabel = useMemo(
    () => `Simulation ${simulationId}`,
    [simulationId],
  );
  const templateKeyLabel = simulationTemplateKey?.trim()
    ? simulationTemplateKey
    : 'N/A';
  const titleLabel = simulationTitle?.trim()
    ? simulationTitle
    : `Simulation ${simulationId}`;
  const roleLabel = simulationPlan?.role?.trim() ? simulationPlan.role : 'N/A';
  const stackLabel = simulationPlan?.techStack?.trim()
    ? simulationPlan.techStack
    : 'N/A';
  const focusLabel = simulationPlan?.focus?.trim()
    ? simulationPlan.focus
    : 'N/A';
  const scenarioLabel = simulationPlan?.scenario?.trim()
    ? simulationPlan.scenario
    : null;
  const planDays = useMemo(() => {
    if (!simulationPlan) return [];
    const byIndex = new Map(
      simulationPlan.days.map((day) => [day.dayIndex, day]),
    );
    return [1, 2, 3, 4, 5].map((dayIndex) => ({
      dayIndex,
      task: byIndex.get(dayIndex) ?? null,
    }));
  }, [simulationPlan]);

  const submitInvite = useCallback(
    async (candidateName: string, inviteEmail: string) => {
      const resResult = await inviteFlow.submit(candidateName, inviteEmail);
      if (!resResult) return;
      const res = resResult;

      setInviteModalOpen(false);

      const who = res.candidateName
        ? `${res.candidateName} (${res.candidateEmail})`
        : res.candidateEmail;

      const actionLabel = res.outcome === 'resent' ? 'resent' : 'sent';
      const toastId = `invite-${res.simulationId}-${res.candidateEmail}`;
      function resetLabel() {
        update(toastId, {
          actions:
            res.inviteUrl && res.inviteUrl.trim()
              ? [
                  {
                    label: 'Copy invite link',
                    onClick: handleCopy,
                  },
                ]
              : undefined,
        });
        if (copyTimersRef.current[toastId]) {
          window.clearTimeout(copyTimersRef.current[toastId]);
          delete copyTimersRef.current[toastId];
        }
      }

      async function handleCopy() {
        if (!res.inviteUrl) return;
        if (copyTimersRef.current[toastId]) {
          window.clearTimeout(copyTimersRef.current[toastId]);
          delete copyTimersRef.current[toastId];
        }
        const ok = await copyToClipboard(res.inviteUrl);
        if (!ok) {
          notify({
            id: `invite-copy-${res.simulationId}-${res.candidateEmail}`,
            tone: 'error',
            title: 'Copy failed',
            description: 'Copy the link manually from the table.',
          });
          resetLabel();
          return;
        }
        update(toastId, { actions: [{ label: 'Copied', disabled: true }] });
        copyTimersRef.current[toastId] = window.setTimeout(() => {
          resetLabel();
        }, 1800);
      }

      notify({
        id: toastId,
        tone: 'success',
        title: `Invite ${actionLabel} for ${who}.`,
        description: res.inviteUrl
          ? 'Share this link with the candidate.'
          : undefined,
        actions:
          res.inviteUrl && res.inviteUrl.trim()
            ? [
                {
                  label: 'Copy invite link',
                  onClick: handleCopy,
                },
              ]
            : undefined,
      });

      void loadCandidates();
    },
    [inviteFlow, loadCandidates, notify, update],
  );

  return (
    <div className="flex flex-col gap-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title={titleLabel}
          subtitle={`Simulation ID: ${simulationId} · Template: ${templateKeyLabel}`}
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              inviteFlow.reset();
              setInviteModalOpen(true);
            }}
            size="sm"
          >
            Invite candidate
          </Button>
          <Link
            className="text-sm text-blue-600 hover:underline"
            href="/dashboard"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              5-day simulation plan
            </h2>
            <p className="text-sm text-gray-600">
              Review the generated prompts and rubrics before inviting
              candidates.
            </p>
          </div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Read-only
          </div>
        </div>

        {planLoading ? (
          <div className="mt-4 text-sm text-gray-600">
            Loading plan details…
          </div>
        ) : planError ? (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {planError}
          </div>
        ) : simulationPlan ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Template
                </div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {templateKeyLabel}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Role
                </div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {roleLabel}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Tech stack
                </div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {stackLabel}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Focus
                </div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {focusLabel}
                </div>
              </div>
            </div>

            {scenarioLabel ? (
              <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Scenario
                </div>
                <p className="mt-1 whitespace-pre-wrap">{scenarioLabel}</p>
              </div>
            ) : null}

            <div className="grid gap-4">
              {planDays.map((slot) => {
                const day = slot.task;
                const dayLabel = `Day ${slot.dayIndex}`;
                const showRepoStatus =
                  slot.dayIndex === 2 || slot.dayIndex === 3;

                if (!day) {
                  return (
                    <div
                      key={`day-${slot.dayIndex}`}
                      className="rounded border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        {dayLabel}
                      </div>
                      <div className="mt-1 text-base font-semibold text-gray-900">
                        Not generated yet
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        No task available yet.
                      </p>
                    </div>
                  );
                }

                const repoStatusLabel =
                  day.provisioned === true
                    ? 'Repo provisioned'
                    : day.provisioned === false
                      ? 'Repo not provisioned yet'
                      : 'Provisioning happens per-candidate after invite.';
                const repoLinkLabel =
                  day.provisioned === true || day.provisioned === false
                    ? 'Repository'
                    : 'Repository link';

                return (
                  <div
                    key={`${day.dayIndex}-${day.title}`}
                    className="rounded border border-gray-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          {dayLabel}
                        </div>
                        <div className="mt-1 text-base font-semibold text-gray-900">
                          {day.title}
                        </div>
                      </div>
                      {day.type ? (
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                          {day.type}
                        </span>
                      ) : null}
                    </div>

                    {day.prompt ? (
                      <div className="mt-3 text-sm text-gray-700">
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Prompt
                        </div>
                        <p className="mt-1 whitespace-pre-wrap">{day.prompt}</p>
                      </div>
                    ) : null}

                    {day.rubricItems.length || day.rubricText ? (
                      <div className="mt-3 text-sm text-gray-700">
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Rubric
                        </div>
                        {day.rubricItems.length ? (
                          <ul className="mt-1 list-disc pl-5">
                            {day.rubricItems.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        ) : day.rubricText ? (
                          <p className="mt-1 whitespace-pre-wrap">
                            {day.rubricText}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {showRepoStatus ? (
                      <div className="mt-3 text-sm text-gray-700">
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Day {slot.dayIndex} workspace
                        </div>
                        <div className="mt-1 flex flex-col gap-1">
                          <div>{repoStatusLabel}</div>
                          {day.repoUrl ? (
                            <div>
                              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                {repoLinkLabel}
                              </div>
                              <a
                                className="text-blue-600 hover:underline"
                                href={day.repoUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {day.repoName ?? 'View repository'}
                              </a>
                            </div>
                          ) : day.repoName ? (
                            <div>
                              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                {repoLinkLabel}
                              </div>
                              <div>{day.repoName}</div>
                            </div>
                          ) : null}
                          {day.codespaceUrl ? (
                            <a
                              className="text-blue-600 hover:underline"
                              href={day.codespaceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open codespace
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
            No simulation plan details available.
          </div>
        )}
      </div>

      {loading ? (
        <div className="overflow-hidden rounded border border-gray-200 bg-white">
          <div className="grid grid-cols-9 gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
            {Array.from({ length: 9 }).map((_, idx) => (
              <Skeleton key={idx} className="h-3 w-20" />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="grid grid-cols-9 items-center gap-3 border-b border-gray-200 px-4 py-3 last:border-b-0"
            >
              <div className="col-span-2 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24 bg-gray-100" />
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <div className="flex justify-end">
                <Skeleton className="h-8 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div>{error}</div>
          <div className="mt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadCandidates()}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : candidates.length === 0 ? (
        <div className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-700">
          <div className="text-base font-semibold text-gray-900">
            No candidates yet
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Invite candidates to this simulation to track their progress and
            submissions.
          </div>
          <div className="mt-3">
            <Button onClick={() => setInviteModalOpen(true)}>
              Invite your first candidate
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="w-full max-w-xs">
                <label
                  className="text-xs font-medium uppercase tracking-wide text-gray-500"
                  htmlFor="candidate-search"
                >
                  Search candidates
                </label>
                <Input
                  id="candidate-search"
                  name="candidate-search"
                  placeholder="Search by name or email"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span>
                  Showing {pagedCandidates.length} of {visibleCandidates.length}{' '}
                  (total {candidates.length})
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1}
                  >
                    Prev
                  </Button>
                  <span className="min-w-[70px] text-center text-gray-600">
                    Page {page} / {pageCount}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setPage((prev) => Math.min(pageCount, prev + 1))
                    }
                    disabled={page >= pageCount}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
          {visibleCandidates.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-700">
              No candidates match your search.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Report</th>
                  <th className="px-4 py-3">Invite email</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Day progress</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedCandidates.map((c) => {
                  const display = c.candidateName || c.inviteEmail || 'Unnamed';
                  const rowState =
                    rowStates[candidateKey(c.candidateSessionId)] ?? {};
                  const sentAt = formatDateTime(c.inviteEmailSentAt ?? null);
                  const inviteLink = c.inviteUrl?.trim() || null;
                  const startedAt = formatDateTime(c.startedAt);
                  const completedAt = formatDateTime(c.completedAt);
                  const verifiedAt = formatDateTime(c.verifiedAt ?? null);
                  const dayProgress = formatDayProgress(c.dayProgress ?? null);
                  const reportReady =
                    c.hasReport || c.reportReady || Boolean(c.reportId);
                  const derivedStatus = deriveStatus(c);
                  const now = cooldownTick || Date.now();
                  const cooldownActive =
                    typeof rowState.cooldownUntilMs === 'number' &&
                    rowState.cooldownUntilMs > now;
                  const resendDisabled = rowState.resending || cooldownActive;
                  const cooldownRemainingMs =
                    cooldownActive &&
                    typeof rowState.cooldownUntilMs === 'number'
                      ? Math.max(0, rowState.cooldownUntilMs - now)
                      : null;

                  return (
                    <tr
                      key={c.candidateSessionId}
                      data-testid={`candidate-row-${c.candidateSessionId}`}
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-gray-900">
                          {display}
                        </div>
                        {c.inviteEmail ? (
                          <div className="text-xs text-gray-500">
                            {c.inviteEmail}
                          </div>
                        ) : null}
                        <div className="text-xs text-gray-400">
                          {c.candidateSessionId}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <CandidateStatusPill status={derivedStatus} />
                      </td>

                      <td className="px-4 py-3 align-top">
                        {reportReady ? (
                          <StatusPill label="Report ready" tone="success" />
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top text-gray-700">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm font-medium text-gray-800">
                            {inviteStatusLabel(c.inviteEmailStatus ?? null)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {sentAt ? `Sent at ${sentAt}` : 'Not sent yet'}
                          </div>
                          {c.inviteEmailError ? (
                            <div className="text-xs text-red-600">
                              {c.inviteEmailError}
                            </div>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCopy(c)}
                              disabled={rowState.resending || !inviteLink}
                            >
                              {rowState.copied ? 'Copied' : 'Copy invite link'}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleResend(c)}
                              disabled={resendDisabled}
                            >
                              {rowState.resending
                                ? 'Resending…'
                                : 'Resend invite'}
                            </Button>
                          </div>
                          {!inviteLink ? (
                            <div className="text-xs text-gray-600">
                              Invite link unavailable — resend invite or
                              refresh.
                            </div>
                          ) : null}
                          {rowState.manualCopyOpen && rowState.manualCopyUrl ? (
                            <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-2">
                              <div className="text-xs text-gray-600">
                                Copy the link manually:
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <input
                                  className="w-full rounded border border-gray-200 bg-white px-2 py-1 font-mono text-xs"
                                  readOnly
                                  value={rowState.manualCopyUrl}
                                  onFocus={(e) => e.currentTarget.select()}
                                  aria-label="Manual invite link"
                                />
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    updateRowState(
                                      candidateKey(c.candidateSessionId),
                                      (prev) => ({
                                        ...prev,
                                        manualCopyOpen: false,
                                        manualCopyUrl: null,
                                      }),
                                    )
                                  }
                                >
                                  Close
                                </Button>
                              </div>
                            </div>
                          ) : null}
                          {cooldownActive ? (
                            <div className="text-xs text-gray-600">
                              {cooldownRemainingMs
                                ? formatCooldown(cooldownRemainingMs)
                                : 'Rate limited — try again soon'}
                            </div>
                          ) : null}
                          {rowState.error ? (
                            <div className="text-xs text-red-600">
                              {rowState.error}
                            </div>
                          ) : null}
                          {rowState.message ? (
                            <div className="text-xs text-green-700">
                              {rowState.message}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top text-gray-700">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm font-medium text-gray-800">
                            {verificationStatusLabel(c)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {verifiedAt ? `Verified at ${verifiedAt}` : '—'}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top text-gray-700">
                        {dayProgress ?? '—'}
                      </td>

                      <td className="px-4 py-3 align-top text-gray-700">
                        {startedAt ?? '—'}
                      </td>

                      <td className="px-4 py-3 align-top text-gray-700">
                        {completedAt ?? '—'}
                      </td>

                      <td className="px-4 py-3 text-right align-top">
                        <Link
                          className="text-blue-600 hover:underline"
                          href={`/dashboard/simulations/${simulationId}/candidates/${c.candidateSessionId}`}
                        >
                          View submissions →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <InviteCandidateModal
        open={inviteModalOpen}
        title={inviteLabel}
        state={
          inviteFlow.state.status === 'error'
            ? { status: 'error', message: inviteFlow.state.message ?? '' }
            : { status: inviteFlow.state.status }
        }
        onClose={() => {
          inviteFlow.reset();
          setInviteModalOpen(false);
        }}
        onSubmit={submitInvite}
        initialName=""
        initialEmail=""
      />
    </div>
  );
}
