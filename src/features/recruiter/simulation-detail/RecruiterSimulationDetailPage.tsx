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
import { toUserMessage } from '@/lib/utils/errors';
import type { CandidateSession } from '@/types/recruiter';

type RowState = {
  resending?: boolean;
  copied?: boolean;
  error?: string | null;
  message?: string | null;
  cooldownUntilMs?: number | null;
};

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function normalizeCandidateSession(raw: unknown): CandidateSession {
  if (!raw || typeof raw !== 'object') {
    return {
      candidateSessionId: 0,
      inviteEmail: null,
      candidateName: null,
      status: 'not_started',
      startedAt: null,
      completedAt: null,
      hasReport: false,
    };
  }

  const rec = raw as Record<string, unknown>;

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
    inviteToken: toStringOrNull(
      rec.token ?? rec.inviteToken ?? rec.invite_token,
    ),
    inviteUrl: toStringOrNull(rec.inviteUrl ?? rec.invite_url),
    inviteEmailStatus: toStringOrNull(
      rec.inviteEmailStatus ?? rec.invite_email_status,
    ),
    inviteEmailSentAt: toStringOrNull(
      rec.inviteEmailSentAt ?? rec.invite_email_sent_at,
    ),
    inviteEmailError: toStringOrNull(
      rec.inviteEmailError ?? rec.invite_email_error,
    ),
  };
}

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

function buildInviteLink(candidate: CandidateSession): string | null {
  if (candidate.inviteUrl?.trim()) return candidate.inviteUrl.trim();
  return null;
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

  const mountedRef = useRef(true);
  const toastTimerRef = useRef<number | null>(null);
  const toastCopyTimerRef = useRef<number | null>(null);
  const cooldownTimersRef = useRef<Record<number, number>>({});
  const RATE_LIMIT_MESSAGE = 'Rate limited — try again in ~30s';

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
    };
  }, []);

  useEffect(() => {
    setCandidates([]);
    setRowStates({});
    setError(null);
  }, [simulationId]);

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

  const rows = useMemo(() => candidates ?? [], [candidates]);

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

  const handleCopy = useCallback(
    async (candidate: CandidateSession) => {
      const link = buildInviteLink(candidate);
      const id = candidate.candidateSessionId;
      if (!link) {
        updateRowState(id, (prev) => ({
          ...prev,
          copied: false,
          message: null,
          error: 'Invite link unavailable — resend invite or refresh.',
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
      }));

      window.setTimeout(() => {
        if (!mountedRef.current) return;
        updateRowState(id, (prev) => ({
          ...prev,
          copied: false,
          message: null,
        }));
      }, 1800);
    },
    [updateRowState],
  );

  const handleResend = useCallback(
    async (candidate: CandidateSession) => {
      const id = candidate.candidateSessionId;
      const startCooldown = () => {
        updateRowState(id, (prev) => ({
          ...prev,
          resending: false,
          message: RATE_LIMIT_MESSAGE,
          cooldownUntilMs: Date.now() + 30_000,
        }));
        if (cooldownTimersRef.current[id])
          window.clearTimeout(cooldownTimersRef.current[id]);
        cooldownTimersRef.current[id] = window.setTimeout(() => {
          updateRowState(id, (prev) => ({
            ...prev,
            cooldownUntilMs: null,
            message: prev.message === RATE_LIMIT_MESSAGE ? null : prev.message,
          }));
          delete cooldownTimersRef.current[id];
        }, 30_000);
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
          return;
        }

        if (!res.ok) {
          if (rateLimited) {
            startCooldown();
            return;
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
          startCooldown();
        } else {
          updateRowState(id, (prev) => ({
            ...prev,
            resending: false,
            message: inviteStatusLabel(
              (parsed as CandidateSession | null)?.inviteEmailStatus ?? 'sent',
            ),
            cooldownUntilMs: prev.cooldownUntilMs ?? null,
          }));
        }
      } catch (e: unknown) {
        if (!mountedRef.current) return;
        updateRowState(id, (prev) => ({
          ...prev,
          resending: false,
          error: errorToMessage(e, 'Unable to resend invite.'),
        }));
      }
    },
    [loadCandidates, simulationId, updateRowState],
  );

  const dismissToast = useCallback(() => {
    setToast({ open: false });
    setToastCopied(false);
  }, []);

  const inviteLabel = useMemo(
    () => `Simulation ${simulationId}`,
    [simulationId],
  );

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
          title="Simulation"
          subtitle={`Simulation ID: ${simulationId}`}
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
                const inviteLink = buildInviteLink(c);
                const startedAt = formatDateTime(c.startedAt);
                const completedAt = formatDateTime(c.completedAt);
                const cooldownActive =
                  typeof rowState.cooldownUntilMs === 'number' &&
                  rowState.cooldownUntilMs > Date.now();
                const resendDisabled = rowState.resending || cooldownActive;

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
                        {cooldownActive ? (
                          <div className="text-xs text-gray-600">
                            Rate limited — try again in ~30s
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
