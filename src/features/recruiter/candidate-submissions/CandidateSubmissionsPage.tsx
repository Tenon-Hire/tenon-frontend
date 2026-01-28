'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import { CandidateStatusPill } from '@/features/recruiter/components/CandidateStatusPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import type { CandidateSession } from '@/types/recruiter';
import { errorDetailEnabled, toUserMessage } from '@/lib/utils/errors';
import { listSimulationCandidates } from '@/lib/api/recruiter';
import { recruiterBffClient } from '@/lib/api/httpClient';

type SubmissionListItem = {
  submissionId: number;
  candidateSessionId: number;
  taskId: number;
  dayIndex: number;
  type: string;
  submittedAt: string;
  repoUrl?: string | null;
  repoFullName?: string | null;
  workflowUrl?: string | null;
  commitUrl?: string | null;
  diffUrl?: string | null;
  diffSummary?: Record<string, unknown> | null;
  testResults?: SubmissionTestResults | null;
};

type SubmissionListResponse = {
  items: SubmissionListItem[];
};

type SubmissionTestResults = {
  passed: number | null;
  failed: number | null;
  total: number | null;
  stdout: string | null;
  stderr: string | null;
  stdoutTruncated?: boolean | null;
  stderrTruncated?: boolean | null;
  runId?: string | null;
  workflowRunId?: string | null;
  runStatus?: string | null;
  conclusion?: string | null;
  timeout?: boolean | null;
  summary?: unknown;
  commitUrl?: string | null;
  workflowUrl?: string | null;
  artifactName?: string | null;
  artifactPresent?: boolean | null;
  artifactErrorCode?: string | null;
  output?: unknown;
};

type SubmissionArtifact = {
  submissionId: number;
  candidateSessionId: number;
  task: {
    taskId: number;
    dayIndex: number;
    type: string;
    title: string;
    prompt: string | null;
  };
  contentText: string | null;
  code?: {
    blob?: string | null;
    repoPath?: string | null;
    repoFullName?: string | null;
    repoUrl?: string | null;
  } | null;
  repoUrl?: string | null;
  repoFullName?: string | null;
  workflowUrl?: string | null;
  commitUrl?: string | null;
  diffUrl?: string | null;
  diffSummary?: Record<string, unknown> | null;
  testResults: SubmissionTestResults | null;
  submittedAt: string;
};

const MarkdownPreviewLazy = dynamic(
  () => import('@/components/ui/Markdown').then((mod) => mod.MarkdownPreview),
  {
    ssr: false,
    loading: () => (
      <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
    ),
  },
);

function formatDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function formatStatusLabel(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/_/g, ' ').toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function deriveRepoInfo(artifact: SubmissionArtifact) {
  const code =
    artifact.code && typeof artifact.code === 'object' ? artifact.code : null;
  const repoPathAsFullName =
    (artifact.task.dayIndex === 2 || artifact.task.dayIndex === 3) &&
    typeof code?.repoPath === 'string' &&
    !code.repoPath.includes('http')
      ? code.repoPath
      : null;
  const repoFullName =
    artifact.repoFullName ?? code?.repoFullName ?? repoPathAsFullName ?? null;
  const repoUrlExplicit =
    artifact.repoUrl ??
    code?.repoUrl ??
    (typeof code?.repoPath === 'string' && code.repoPath.includes('http')
      ? code.repoPath
      : null) ??
    null;

  const repoUrl =
    repoUrlExplicit ??
    (repoFullName && repoFullName.includes('/')
      ? `https://github.com/${repoFullName}`
      : null);

  return {
    repoUrl,
    repoFullName,
  };
}

async function fetchArtifactsWithLimit(
  ids: number[],
  options: {
    signal?: AbortSignal;
    skipCache?: boolean;
    cacheTtlMs?: number;
    concurrency?: number;
  },
): Promise<Record<number, SubmissionArtifact>> {
  if (!ids.length) return {};
  const results: Record<number, SubmissionArtifact> = {};
  const limit = Math.max(1, Math.min(options.concurrency ?? 4, 12));
  let index = 0;

  const worker = async () => {
    while (index < ids.length) {
      const current = ids[index];
      index += 1;
      try {
        const artifact = await recruiterBffClient.get<SubmissionArtifact>(
          `/submissions/${current}`,
          {
            cache: 'no-store',
            signal: options.signal,
            skipCache: options.skipCache,
            cacheTtlMs: options.cacheTtlMs ?? 10000,
            dedupeKey: `submission-${current}`,
          },
        );
        results[current] = artifact;
      } catch {}
    }
  };

  const workers = Array.from({ length: Math.min(limit, ids.length) }).map(() =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

type StatusTone = 'info' | 'success' | 'warning' | 'muted';

function deriveTestStatus(testResults: SubmissionTestResults | null): {
  label: string;
  tone: StatusTone;
} {
  if (!testResults) return { label: 'Not run', tone: 'muted' };
  if (testResults.timeout) return { label: 'Timed out', tone: 'warning' };

  const conclusion = (testResults.conclusion ?? '').toString().toLowerCase();
  const runStatus = (testResults.runStatus ?? '').toString().toLowerCase();

  if (
    runStatus === 'running' ||
    runStatus === 'in_progress' ||
    runStatus === 'queued'
  ) {
    return { label: 'Running', tone: 'info' };
  }

  if (conclusion === 'success' || conclusion === 'passed')
    return { label: 'Passed', tone: 'success' };
  if (conclusion === 'failure' || conclusion === 'failed')
    return { label: 'Failed', tone: 'warning' };

  const failed = Number.isFinite(testResults.failed)
    ? (testResults.failed as number)
    : null;
  if (failed && failed > 0) return { label: 'Failed', tone: 'warning' };

  const passed = Number.isFinite(testResults.passed)
    ? (testResults.passed as number)
    : null;
  const total = Number.isFinite(testResults.total)
    ? (testResults.total as number)
    : null;
  if (passed && total && passed === total) {
    return { label: 'Passed', tone: 'success' };
  }

  if (runStatus) {
    return {
      label: formatStatusLabel(testResults.runStatus) ?? 'Running',
      tone: 'info',
    };
  }

  if (conclusion) {
    return {
      label: formatStatusLabel(testResults.conclusion) ?? 'Unknown',
      tone: 'muted',
    };
  }

  return { label: 'Not run', tone: 'muted' };
}

function ArtifactLink({
  label,
  url,
  text,
  fallback = 'Not available',
}: {
  label: string;
  url: string | null;
  text?: string | null;
  fallback?: string;
}) {
  return (
    <div className="text-xs text-gray-700">
      <div className="font-semibold text-gray-800">{label}</div>
      {url ? (
        <a
          className="text-blue-600 hover:underline"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {text ?? url}
        </a>
      ) : (
        <div className="text-gray-500">{fallback}</div>
      )}
    </div>
  );
}

function DiffSummary({
  diffSummary,
}: {
  diffSummary: Record<string, unknown>;
}) {
  return (
    <div className="mt-2 rounded border border-gray-200 bg-white/60 p-2 text-[11px] text-gray-700">
      <div className="font-semibold text-gray-800">Diff summary</div>
      <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-[11px]">
        {JSON.stringify(diffSummary, null, 2)}
      </pre>
    </div>
  );
}

function hasContent(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasGithubFields(artifact: SubmissionArtifact) {
  return Boolean(
    artifact.repoUrl ||
    artifact.repoFullName ||
    artifact.workflowUrl ||
    artifact.commitUrl ||
    artifact.diffUrl ||
    artifact.diffSummary ||
    artifact.testResults?.workflowUrl ||
    artifact.testResults?.commitUrl,
  );
}

function shouldShowGithubSection(artifact: SubmissionArtifact) {
  const day = artifact.task.dayIndex;
  return day === 2 || day === 3 || hasGithubFields(artifact);
}

function LogViewer({
  label,
  value,
  truncated,
}: {
  label: string;
  value: string | null;
  truncated?: boolean | null;
}) {
  const [open, setOpen] = useState(false);
  const hasValue = hasContent(value);

  if (!hasValue && !truncated) return null;

  return (
    <div className="rounded border border-gray-200 bg-white p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-gray-800">
          {label}
          {truncated ? ' (truncated)' : ''}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? 'Hide' : hasValue ? 'View' : 'Show'}
        </Button>
      </div>
      {open ? (
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[11px] text-gray-800">
          {hasValue ? value : 'No output captured.'}
        </pre>
      ) : null}
    </div>
  );
}

function TestResultsSection({ artifact }: { artifact: SubmissionArtifact }) {
  const testResults = artifact.testResults;
  const status = deriveTestStatus(testResults);
  const workflowUrl = artifact.workflowUrl ?? testResults?.workflowUrl ?? null;
  const commitUrl = artifact.commitUrl ?? testResults?.commitUrl ?? null;
  const diffUrl = artifact.diffUrl ?? null;

  const hasCounts =
    testResults &&
    (testResults.passed !== null ||
      testResults.failed !== null ||
      testResults.total !== null);
  const hasLogs =
    (testResults && hasContent(testResults.stdout)) ||
    (testResults && hasContent(testResults.stderr)) ||
    Boolean(testResults?.stdoutTruncated || testResults?.stderrTruncated);

  return (
    <div className="mt-3 rounded border border-gray-100 bg-gray-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-semibold text-gray-900">Test results</div>
        <StatusPill label={status.label} tone={status.tone} />
        {testResults?.runStatus ? (
          <span className="text-xs text-gray-600">
            Workflow: {formatStatusLabel(testResults.runStatus)}
          </span>
        ) : null}
        {testResults?.workflowRunId ? (
          <span className="text-xs text-gray-600">
            Run ID: {testResults.workflowRunId}
          </span>
        ) : null}
        {testResults?.timeout ? (
          <span className="text-xs text-orange-700">Timed out</span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-blue-700">
        {workflowUrl ? (
          <a
            className="text-blue-600 hover:underline"
            href={workflowUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Workflow run
          </a>
        ) : null}
        {commitUrl ? (
          <a
            className="text-blue-600 hover:underline"
            href={commitUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Commit
          </a>
        ) : null}
        {diffUrl ? (
          <a
            className="text-blue-600 hover:underline"
            href={diffUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Diff
          </a>
        ) : null}
      </div>

      {testResults ? (
        <>
          {hasCounts ? (
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded border border-gray-200 bg-white p-2 text-gray-700">
                <div className="text-[11px] uppercase text-gray-500">
                  Passed
                </div>
                <div className="text-sm font-semibold">
                  {testResults.passed ?? '—'}
                </div>
              </div>
              <div className="rounded border border-gray-200 bg-white p-2 text-gray-700">
                <div className="text-[11px] uppercase text-gray-500">
                  Failed
                </div>
                <div className="text-sm font-semibold">
                  {testResults.failed ?? '—'}
                </div>
              </div>
              <div className="rounded border border-gray-200 bg-white p-2 text-gray-700">
                <div className="text-[11px] uppercase text-gray-500">Total</div>
                <div className="text-sm font-semibold">
                  {testResults.total ?? '—'}
                </div>
              </div>
            </div>
          ) : null}

          {testResults.summary ? (
            <div className="mt-2 rounded border border-gray-200 bg-white p-2 text-[11px] text-gray-800">
              <div className="font-semibold text-gray-900">Summary</div>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-[11px]">
                {JSON.stringify(testResults.summary, null, 2)}
              </pre>
            </div>
          ) : null}

          {hasLogs ? (
            <div className="mt-2 space-y-2">
              <LogViewer
                label="Stdout"
                value={testResults?.stdout ?? null}
                truncated={testResults?.stdoutTruncated}
              />
              <LogViewer
                label="Stderr"
                value={testResults?.stderr ?? null}
                truncated={testResults?.stderrTruncated}
              />
            </div>
          ) : (
            <div className="mt-2 text-xs text-gray-700">
              No test output captured.
            </div>
          )}
        </>
      ) : (
        <div className="mt-2 text-xs text-gray-700">
          No GitHub test results captured yet.
        </div>
      )}
    </div>
  );
}

export function ArtifactCard({ artifact }: { artifact: SubmissionArtifact }) {
  const { repoUrl, repoFullName } = deriveRepoInfo(artifact);
  const workflowUrl =
    artifact.workflowUrl ?? artifact.testResults?.workflowUrl ?? null;
  const commitUrl =
    artifact.commitUrl ?? artifact.testResults?.commitUrl ?? null;
  const submittedAt = formatDateTime(artifact.submittedAt);
  const diffSummary = artifact.diffSummary ?? null;
  const hasPrompt = hasContent(artifact.task.prompt);
  const repoLabel =
    repoFullName ??
    repoUrl ??
    artifact.code?.repoPath ??
    artifact.code?.repoFullName ??
    null;
  const showGithub = shouldShowGithubSection(artifact);
  const [expanded, setExpanded] = useState(false);
  const hasContentText = hasContent(artifact.contentText);
  const previewText = hasContentText
    ? (artifact.contentText as string).slice(0, 320)
    : '';
  const canToggleText =
    hasContentText &&
    (artifact.contentText as string).length > previewText.length;

  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">
            Day {artifact.task.dayIndex}: {artifact.task.title}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {artifact.task.type} •{' '}
            {submittedAt ? `submitted ${submittedAt}` : 'submission time N/A'}
          </div>
        </div>
      </div>

      {showGithub ? (
        <>
          <div className="mt-3 rounded border border-gray-100 bg-gray-50 p-3">
            <div className="text-xs font-semibold uppercase text-gray-700">
              GitHub artifacts
            </div>
            <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
              <ArtifactLink
                label="Repository"
                url={repoUrl ?? null}
                text={repoLabel}
              />
              <ArtifactLink
                label="Workflow run"
                url={workflowUrl}
                text={workflowUrl ? 'Open workflow run' : null}
              />
              <ArtifactLink
                label="Commit"
                url={commitUrl}
                text={commitUrl ? 'Open commit' : null}
              />
              <ArtifactLink
                label="Diff"
                url={artifact.diffUrl ?? null}
                text={artifact.diffUrl ? 'View diff' : null}
              />
            </div>
            {diffSummary ? <DiffSummary diffSummary={diffSummary} /> : null}
          </div>

          <TestResultsSection artifact={artifact} />
        </>
      ) : null}

      {artifact.task.prompt ? (
        <div className="mt-3">
          <div className="mb-1 text-xs font-medium text-gray-600">Prompt</div>
          <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-900">
            {artifact.task.prompt}
          </pre>
        </div>
      ) : null}

      {hasContentText ? (
        <div className="mt-3">
          <div className="mb-1 text-xs font-medium text-gray-600">
            Text answer
          </div>
          <div className="max-h-[420px] overflow-auto rounded border border-gray-100 bg-gray-50 p-3">
            {expanded ? (
              <MarkdownPreviewLazy content={artifact.contentText as string} />
            ) : (
              <div className="whitespace-pre-wrap text-sm text-gray-900">
                {previewText}
                {canToggleText ? '…' : ''}
              </div>
            )}
          </div>
          {canToggleText ? (
            <div className="mt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? 'Collapse' : 'Expand'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {!artifact.contentText && !hasPrompt ? (
        <div className="mt-3 text-sm text-gray-600">
          {showGithub
            ? 'This is a code task; see GitHub artifacts and test results above.'
            : 'No text answer submitted.'}
        </div>
      ) : null}
    </div>
  );
}

export default function CandidateSubmissionsPage() {
  const params = useParams<{ id: string; candidateSessionId: string }>();
  const simulationId = params.id;
  const candidateSessionIdParam = params.candidateSessionId ?? '';
  const candidateSessionKey = String(candidateSessionIdParam).trim();
  const includeDetail = errorDetailEnabled();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [candidate, setCandidate] = useState<CandidateSession | null>(null);
  const [items, setItems] = useState<SubmissionListItem[]>([]);
  const [artifacts, setArtifacts] = useState<
    Record<number, SubmissionArtifact>
  >({});
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;
  const artifactsRef = useRef<Record<number, SubmissionArtifact>>({});
  const currentRequestRef = useRef<AbortController | null>(null);
  const pageRequestRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const pageRequestIdRef = useRef(0);
  const showAllRef = useRef(false);
  const statusDisplay = candidate?.status ?? null;

  useEffect(() => {
    artifactsRef.current = artifacts;
  }, [artifacts]);

  useEffect(() => {
    showAllRef.current = showAll;
  }, [showAll]);

  const loadSubmissions = useCallback(
    (opts?: { skipCache?: boolean }): (() => void) => {
      currentRequestRef.current?.abort();
      pageRequestRef.current?.abort();
      const controller = new AbortController();
      currentRequestRef.current = controller;
      const requestId = ++requestIdRef.current;
      let candidateVerified = false;

      async function run() {
        try {
          setLoading(true);
          setError(null);

          if (!candidateSessionKey || !/^\d+$/.test(candidateSessionKey)) {
            throw new Error('Invalid candidate id.');
          }

          if (opts?.skipCache) {
            setArtifacts({});
          }

          const candidatesPromise = listSimulationCandidates(simulationId, {
            skipCache: opts?.skipCache,
            signal: controller.signal,
            cacheTtlMs: 9000,
          });
          const candArr = await candidatesPromise;
          if (controller.signal.aborted || requestIdRef.current !== requestId)
            return;

          const found =
            candArr.find(
              (c) => String(c.candidateSessionId) === candidateSessionKey,
            ) ?? null;
          if (!found) {
            throw new Error('Candidate not found for this simulation.');
          }
          candidateVerified = true;
          setCandidate(found);

          const listJson = await recruiterBffClient.get<SubmissionListResponse>(
            `/submissions?candidateSessionId=${encodeURIComponent(
              candidateSessionKey,
            )}`,
            {
              cache: 'no-store',
              signal: controller.signal,
              skipCache: opts?.skipCache,
              cacheTtlMs: 9000,
            },
          );
          if (controller.signal.aborted || requestIdRef.current !== requestId)
            return;

          const ordered = [...(listJson.items ?? [])].sort(
            (a, b) => a.dayIndex - b.dayIndex,
          );
          setItems(ordered);
          setPage(1);

          if (ordered.length === 0) {
            setArtifacts({});
            return;
          }

          const pickLatest = (day: number) => {
            const candidates = ordered.filter(
              (it) => Number(it.dayIndex) === day,
            );
            if (!candidates.length) return null;
            let best: SubmissionListItem | null = null;
            for (const cand of candidates) {
              const ts = Date.parse(cand.submittedAt ?? '');
              const candTs = Number.isNaN(ts) ? null : ts;
              const bestTs =
                best && !Number.isNaN(Date.parse(best.submittedAt))
                  ? Date.parse(best.submittedAt)
                  : null;

              if (!best) {
                best = cand;
                continue;
              }
              if (candTs !== null && bestTs !== null && candTs > bestTs) {
                best = cand;
                continue;
              }
              if (candTs !== null && bestTs === null) {
                best = cand;
                continue;
              }
              if (
                candTs === null &&
                bestTs === null &&
                cand.submissionId > best.submissionId
              ) {
                best = cand;
              }
            }
            return best;
          };

          const latestIds: number[] = [];
          const latest2 = pickLatest(2);
          const latest3 = pickLatest(3);
          if (latest2) latestIds.push(latest2.submissionId);
          if (latest3) latestIds.push(latest3.submissionId);

          const initialPageIds = showAllRef.current
            ? ordered.slice(0, PAGE_SIZE).map((it) => it.submissionId)
            : [];

          const idsToFetch = Array.from(
            new Set([...latestIds, ...initialPageIds]),
          );

          if (idsToFetch.length) {
            const fetched = await fetchArtifactsWithLimit(idsToFetch, {
              signal: controller.signal,
              skipCache: opts?.skipCache,
              cacheTtlMs: 10000,
            });
            if (controller.signal.aborted || requestIdRef.current !== requestId)
              return;
            setArtifacts((prev) => {
              const next = { ...prev, ...fetched };
              artifactsRef.current = next;
              return next;
            });
          }
        } catch (e: unknown) {
          if (controller.signal.aborted || requestIdRef.current !== requestId) {
            return;
          }

          const status =
            e && typeof e === 'object' && 'status' in (e as object)
              ? (e as { status?: unknown }).status
              : null;

          if (!candidateVerified) {
            const message =
              e instanceof Error && e.message
                ? e.message
                : toUserMessage(e, 'Request failed', {
                    includeDetail,
                  });
            setCandidate(null);
            setItems([]);
            setArtifacts({});
            setError(
              typeof status === 'number' && status >= 500
                ? 'Unable to verify candidate access.'
                : message,
            );
            return;
          }

          setError(
            toUserMessage(e, 'Request failed', {
              includeDetail,
            }),
          );
        } finally {
          if (
            requestIdRef.current === requestId &&
            !controller.signal.aborted
          ) {
            setLoading(false);
          }
        }
      }

      void run();
      return () => {
        controller.abort();
      };
    },
    [simulationId, candidateSessionKey, includeDetail, PAGE_SIZE],
  );

  useEffect(() => {
    const cancel = loadSubmissions();
    return () => {
      cancel?.();
    };
  }, [loadSubmissions]);

  const headerTitle = useMemo(() => {
    const label =
      candidate?.candidateName ||
      candidate?.inviteEmail ||
      `Candidate ${candidateSessionKey}`;
    return `${label} — Submissions`;
  }, [candidate, candidateSessionKey]);

  const subtitle = useMemo(() => {
    const bits: string[] = [];
    bits.push(`CandidateSession: ${candidateSessionKey}`);
    if (statusDisplay) bits.push(`Status: ${statusDisplay}`);
    if (candidate?.startedAt)
      bits.push(`Started: ${new Date(candidate.startedAt).toLocaleString()}`);
    if (candidate?.completedAt)
      bits.push(
        `Completed: ${new Date(candidate.completedAt).toLocaleString()}`,
      );
    return bits.join(' • ');
  }, [candidate, candidateSessionKey, statusDisplay]);

  const latestByDay = useMemo(() => {
    const pickLatest = (day: number) => {
      const candidates = items.filter((it) => Number(it.dayIndex) === day);
      if (!candidates.length) return null;
      let best: SubmissionListItem | null = null;
      for (const cand of candidates) {
        const ts = Date.parse(cand.submittedAt ?? '');
        const candTs = Number.isNaN(ts) ? null : ts;
        const bestTs =
          best && !Number.isNaN(Date.parse(best.submittedAt))
            ? Date.parse(best.submittedAt)
            : null;

        if (!best) {
          best = cand;
          continue;
        }
        if (candTs !== null && bestTs !== null && candTs > bestTs) {
          best = cand;
          continue;
        }
        if (candTs !== null && bestTs === null) {
          best = cand;
          continue;
        }
        if (
          candTs === null &&
          bestTs === null &&
          cand.submissionId > best.submissionId
        ) {
          best = cand;
        }
      }
      return best;
    };
    return { day2: pickLatest(2), day3: pickLatest(3) };
  }, [items]);

  const { day2: latestDay2Item, day3: latestDay3Item } = latestByDay;
  const latestDay2 = latestDay2Item
    ? (artifacts[latestDay2Item.submissionId] ?? null)
    : null;
  const latestDay3 = latestDay3Item
    ? (artifacts[latestDay3Item.submissionId] ?? null)
    : null;
  const hasLatest = Boolean(latestDay2Item || latestDay3Item);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / PAGE_SIZE)),
    [PAGE_SIZE, items.length],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!showAll) return;
    setPage(1);
  }, [showAll]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return items.slice(start, end);
  }, [items, page, PAGE_SIZE]);

  useEffect(() => {
    if (!showAll) {
      pageRequestRef.current?.abort();
      return;
    }
    const missingIds = pagedItems
      .map((it) => it.submissionId)
      .filter((id) => !artifactsRef.current[id]);
    if (!missingIds.length) return;

    pageRequestRef.current?.abort();
    const controller = new AbortController();
    pageRequestRef.current = controller;
    const requestId = ++pageRequestIdRef.current;

    fetchArtifactsWithLimit(missingIds, {
      signal: controller.signal,
      cacheTtlMs: 10000,
    })
      .then((fetched) => {
        if (controller.signal.aborted || pageRequestIdRef.current !== requestId)
          return;
        setArtifacts((prev) => {
          const next = { ...prev, ...fetched };
          artifactsRef.current = next;
          return next;
        });
      })
      .catch(() => {});

    return () => controller.abort();
  }, [showAll, pagedItems]);

  return (
    <div className="flex flex-col gap-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <PageHeader title={headerTitle} subtitle={subtitle} />
        <Link
          className="text-sm text-blue-600 hover:underline"
          href={`/dashboard/simulations/${simulationId}`}
        >
          ← Back to candidates
        </Link>
      </div>

      {statusDisplay ? (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <CandidateStatusPill status={statusDisplay} />
          <span>
            {candidate?.inviteEmail
              ? `Invited: ${candidate.inviteEmail}`
              : null}
          </span>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3 rounded border border-gray-200 bg-white p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-60 bg-gray-100" />
          <Skeleton className="h-24 w-full bg-gray-50" />
        </div>
      ) : error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div>{error}</div>
          <div className="mt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadSubmissions({ skipCache: true })}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-700">
          <div className="text-base font-semibold text-gray-900">
            No submissions yet
          </div>
          <div className="mt-1 text-sm text-gray-600">
            The candidate hasn’t submitted work for this simulation yet. Refresh
            to check for new activity.
          </div>
          <div className="mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadSubmissions({ skipCache: true })}
            >
              Refresh
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Latest GitHub artifacts (Day 2 / Day 3)
                </div>
                <div className="text-xs text-gray-600">
                  Shows the newest Day 2 and Day 3 submissions by submitted
                  time.
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3 md:grid md:grid-cols-2">
              {latestDay2 ? (
                <ArtifactCard
                  key={`latest-2-${latestDay2.submissionId}`}
                  artifact={latestDay2}
                />
              ) : latestDay2Item ? (
                <div className="rounded border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  Day 2 submission #{latestDay2Item.submissionId} details
                  unavailable.
                </div>
              ) : (
                <div className="rounded border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  No Day 2 submission yet.
                </div>
              )}
              {latestDay3 ? (
                <ArtifactCard
                  key={`latest-3-${latestDay3.submissionId}`}
                  artifact={latestDay3}
                />
              ) : latestDay3Item ? (
                <div className="rounded border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  Day 3 submission #{latestDay3Item.submissionId} details
                  unavailable.
                </div>
              ) : (
                <div className="rounded border border-dashed border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  No Day 3 submission yet.
                </div>
              )}
            </div>
            {!hasLatest ? (
              <div className="mt-2 text-xs text-gray-600">
                Day 2 / Day 3 artifacts will appear here after the candidate
                submits code.
              </div>
            ) : null}
          </div>

          <div className="rounded border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-gray-900">
                All submissions
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAll((prev) => !prev)}
              >
                {showAll ? 'Hide list' : 'Show all'}
              </Button>
            </div>
            {showAll ? (
              <>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                  <span>
                    Showing{' '}
                    {items.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
                    {Math.min(items.length, page * PAGE_SIZE)} of {items.length}{' '}
                    submissions
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-gray-700">
                      Page {page} / {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {pagedItems.map((it) => {
                    const artifact = artifacts[it.submissionId];
                    return artifact ? (
                      <ArtifactCard key={it.submissionId} artifact={artifact} />
                    ) : (
                      <div
                        key={it.submissionId}
                        className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-700"
                      >
                        Day {it.dayIndex} ({it.type}) — submission #
                        {it.submissionId} content not available.
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="mt-2 text-sm text-gray-600">
                Submission list collapsed for brevity.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
