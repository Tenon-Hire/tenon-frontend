'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import { CandidateStatusPill } from '@/features/recruiter/components/CandidateStatusPill';
import { useInviteCandidateFlow } from '@/features/recruiter/dashboard/hooks/useInviteCandidateFlow';
import { InviteCandidateModal } from '@/features/recruiter/invitations/InviteCandidateModal';
import { InviteToast } from '@/features/recruiter/invitations/InviteToast';
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

export default function RecruiterSimulationDetailPage() {
  const params = useParams<{ id: string }>();
  const simulationId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateSession[]>([]);
  const [simulationTemplateKey, setSimulationTemplateKey] = useState<
    string | null
  >(null);
  const [simulationTitle, setSimulationTitle] = useState<string | null>(null);
  const [rowStates, setRowStates] = useState<Record<number, RowState>>({});
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [toast, setToast] = useState<
    | { open: false }
    | {
        open: true;
        kind: 'success' | 'error';
        message: string;
        inviteUrl?: string;
      }
  >({ open: false });
  const [toastCopied, setToastCopied] = useState(false);
  const [cooldownTick, setCooldownTick] = useState(0);

  const mountedRef = useRef(true);
  const toastTimerRef = useRef<number | null>(null);
  const toastCopyTimerRef = useRef<number | null>(null);
  const cooldownTimersRef = useRef<Record<number, number>>({});
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
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (toastCopyTimerRef.current)
        window.clearTimeout(toastCopyTimerRef.current);
      Object.values(cooldownTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      cooldownTimersRef.current = {};
      if (cooldownIntervalRef.current) {
        window.clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setCandidates([]);
    setRowStates({});
    setError(null);
    setSimulationTemplateKey(null);
    setSimulationTitle(null);
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

  const rows = useMemo(() => candidates ?? [], [candidates]);
  const existingInviteMap = useMemo(() => {
    const entries = new Map<string, CandidateSession>();
    candidates.forEach((candidate) => {
      const key = candidate.inviteEmail?.trim().toLowerCase() ?? '';
      if (!key) return;
      entries.set(key, candidate);
    });
    return entries;
  }, [candidates]);

  const updateRowState = useCallback(
    (
      candidateSessionId: number,
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

  const dismissToast = useCallback(() => {
    setToast({ open: false });
    setToastCopied(false);
  }, []);

  const handleCopy = useCallback(
    async (candidate: CandidateSession) => {
      const link = candidate.inviteUrl?.trim() || null;
      const id = candidate.candidateSessionId;
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
        setToast({
          open: true,
          kind: 'success',
          message: 'Invite link copied.',
        });
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => {
          dismissToast();
          toastTimerRef.current = null;
        }, 4000);
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
    [dismissToast, updateRowState],
  );

  const handleResend = useCallback(
    async (candidate: CandidateSession): Promise<boolean> => {
      const id = candidate.candidateSessionId;
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
              c.candidateSessionId === id ? { ...c, ...normalized } : c,
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
          setToast({
            open: true,
            kind: 'success',
            message: 'Invite resent.',
          });
          if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
          toastTimerRef.current = window.setTimeout(() => {
            dismissToast();
            toastTimerRef.current = null;
          }, 4000);
        }
        return !rateLimited;
      } catch (e: unknown) {
        if (!mountedRef.current) return false;
        updateRowState(id, (prev) => ({
          ...prev,
          resending: false,
          error: errorToMessage(e, 'Unable to resend invite.'),
        }));
        return false;
      }
    },
    [dismissToast, loadCandidates, simulationId, updateRowState],
  );

  const handleResendFromModal = useCallback(
    async (candidateSessionId: number) => {
      const candidate = candidates.find(
        (item) => item.candidateSessionId === candidateSessionId,
      );
      if (!candidate) return;
      const ok = await handleResend(candidate);
      if (ok) setInviteModalOpen(false);
    },
    [candidates, handleResend],
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

  const submitInvite = useCallback(
    async (candidateName: string, inviteEmail: string) => {
      const res = await inviteFlow.submit(candidateName, inviteEmail);
      if (!res) return;

      setInviteModalOpen(false);

      const who = res.candidateName
        ? `${res.candidateName} (${res.candidateEmail})`
        : res.candidateEmail;

      setToast({
        open: true,
        kind: 'success',
        message: `Invite created for ${who}.`,
        inviteUrl: res.inviteUrl,
      });

      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => {
        dismissToast();
        toastTimerRef.current = null;
      }, 6500);

      void loadCandidates();
    },
    [dismissToast, inviteFlow, loadCandidates],
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

      <InviteToast
        toast={toast}
        copied={toastCopied}
        onDismiss={dismissToast}
        onCopyStateChange={(next) => {
          setToastCopied(next);
          if (toastCopyTimerRef.current)
            window.clearTimeout(toastCopyTimerRef.current);
          if (next) {
            toastCopyTimerRef.current = window.setTimeout(() => {
              setToastCopied(false);
              toastCopyTimerRef.current = null;
            }, 1800);
          }
        }}
      />

      {loading ? (
        <div className="text-sm text-gray-600">Loading candidates…</div>
      ) : error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-700">
          No candidates yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Invite email</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Day progress</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((c) => {
                const display = c.candidateName || c.inviteEmail || 'Unnamed';
                const rowState = rowStates[c.candidateSessionId] ?? {};
                const sentAt = formatDateTime(c.inviteEmailSentAt ?? null);
                const inviteLink = c.inviteUrl?.trim() || null;
                const startedAt = formatDateTime(c.startedAt);
                const completedAt = formatDateTime(c.completedAt);
                const verifiedAt = formatDateTime(c.verifiedAt ?? null);
                const dayProgress = formatDayProgress(c.dayProgress ?? null);
                const now = cooldownTick || Date.now();
                const cooldownActive =
                  typeof rowState.cooldownUntilMs === 'number' &&
                  rowState.cooldownUntilMs > now;
                const resendDisabled = rowState.resending || cooldownActive;
                const cooldownRemainingMs =
                  cooldownActive && typeof rowState.cooldownUntilMs === 'number'
                    ? Math.max(0, rowState.cooldownUntilMs - now)
                    : null;

                return (
                  <tr key={c.candidateSessionId}>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-900">{display}</div>
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
                      <CandidateStatusPill status={c.status} />
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
                            Invite link unavailable — resend invite or refresh.
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
                                    c.candidateSessionId,
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
        </div>
      )}

      <InviteCandidateModal
        open={inviteModalOpen}
        title={inviteLabel}
        simulationId={simulationId}
        existingInviteMap={existingInviteMap}
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
        onResend={handleResendFromModal}
        initialName=""
        initialEmail=""
      />
    </div>
  );
}
