'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/common/Button';

type CandidateSession = {
  candidateSessionId: number;
  inviteEmail: string | null;
  candidateName: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt: string | null;
  completedAt: string | null;
  hasReport: boolean;
};

type SubmissionListItem = {
  submissionId: number;
  candidateSessionId: number;
  taskId: number;
  dayIndex: number;
  type: string;
  submittedAt: string;
};

type SubmissionListResponse = {
  items: SubmissionListItem[];
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
  code: { blob: string | null; repoPath: string | null } | null;
  testResults: unknown | null;
  submittedAt: string;
};

function downloadTextFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ArtifactCard({ artifact }: { artifact: SubmissionArtifact }) {
  const isCodeTask =
    artifact.task.type === 'code' || artifact.task.type === 'debug';
  const codeBlob = (artifact.code?.blob ?? '').trim();

  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">
            Day {artifact.task.dayIndex}: {artifact.task.title}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {artifact.task.type} • submitted{' '}
            {new Date(artifact.submittedAt).toLocaleString()}
          </div>
        </div>

        {isCodeTask && codeBlob ? (
          <div className="flex items-center gap-2">
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(codeBlob);
                } catch {}
              }}
            >
              Copy code
            </Button>
            <Button
              onClick={() =>
                downloadTextFile(
                  `day-${artifact.task.dayIndex}-${artifact.task.type}.txt`,
                  codeBlob,
                )
              }
            >
              Download
            </Button>
          </div>
        ) : null}
      </div>

      {artifact.task.prompt ? (
        <div className="mt-3">
          <div className="mb-1 text-xs font-medium text-gray-600">Prompt</div>
          <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-900">
            {artifact.task.prompt}
          </pre>
        </div>
      ) : null}

      {artifact.contentText ? (
        <div className="mt-3">
          <div className="mb-1 text-xs font-medium text-gray-600">
            Text answer
          </div>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-900">
            {artifact.contentText}
          </pre>
        </div>
      ) : null}

      {isCodeTask && codeBlob ? (
        <div className="mt-3">
          <div className="mb-1 text-xs font-medium text-gray-600">Code</div>
          <pre className="max-h-[520px] overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-900">
            {codeBlob}
          </pre>
          {artifact.code?.repoPath ? (
            <div className="mt-2 text-xs text-gray-500">
              Path: {artifact.code.repoPath}
            </div>
          ) : null}
        </div>
      ) : null}

      {artifact.testResults ? (
        <div className="mt-3">
          <div className="mb-1 text-xs font-medium text-gray-600">
            Test results
          </div>
          <pre className="max-h-[320px] overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-900">
            {JSON.stringify(artifact.testResults, null, 2)}
          </pre>
        </div>
      ) : null}

      {!artifact.contentText && !(isCodeTask && codeBlob) ? (
        <div className="mt-3 text-sm text-gray-600">
          No content captured for this submission.
        </div>
      ) : null}
    </div>
  );
}

function parseErrorMessage(u: unknown): string {
  if (u && typeof u === 'object') {
    const msg = (u as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    const detail = (u as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
  }
  if (u instanceof Error) return u.message;
  return 'Request failed';
}

export default function CandidateSubmissionsContent() {
  const params = useParams<{ id: string; candidateSessionId: string }>();
  const simulationId = params.id;
  const candidateSessionId = Number(params.candidateSessionId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [candidate, setCandidate] = useState<CandidateSession | null>(null);
  const [items, setItems] = useState<SubmissionListItem[]>([]);
  const [artifacts, setArtifacts] = useState<
    Record<number, SubmissionArtifact>
  >({});

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError(null);

        const candRes = await fetch(
          `/api/simulations/${simulationId}/candidates`,
          { method: 'GET', cache: 'no-store' },
        );

        if (candRes.ok) {
          const candArr = (await candRes.json()) as CandidateSession[];
          const found =
            candArr.find((c) => c.candidateSessionId === candidateSessionId) ??
            null;
          if (!cancelled) setCandidate(found);
        } else {
          if (!cancelled) setCandidate(null);
        }

        const listRes = await fetch(
          `/api/submissions?candidateSessionId=${encodeURIComponent(
            String(candidateSessionId),
          )}`,
          { method: 'GET', cache: 'no-store' },
        );

        if (!listRes.ok) {
          const maybeJson: unknown = await listRes.json().catch(() => null);
          const fallbackText = await listRes.text().catch(() => '');
          const msg =
            maybeJson !== null ? parseErrorMessage(maybeJson) : fallbackText;
          throw new Error(
            msg || `Failed to load submissions (${listRes.status})`,
          );
        }

        const listJson = (await listRes.json()) as SubmissionListResponse;
        const ordered = [...(listJson.items ?? [])].sort(
          (a, b) => a.dayIndex - b.dayIndex,
        );
        if (!cancelled) setItems(ordered);

        if (ordered.length === 0) {
          if (!cancelled) setArtifacts({});
          return;
        }

        const results = await Promise.all(
          ordered.map(async (s) => {
            const r = await fetch(`/api/submissions/${s.submissionId}`, {
              method: 'GET',
              cache: 'no-store',
            });
            if (!r.ok) return null;
            const a = (await r.json()) as SubmissionArtifact;
            return a;
          }),
        );

        const map: Record<number, SubmissionArtifact> = {};
        for (const a of results) {
          if (!a) continue;
          map[a.submissionId] = a;
        }
        if (!cancelled) setArtifacts(map);
      } catch (e: unknown) {
        if (!cancelled) setError(parseErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [simulationId, candidateSessionId]);

  const headerTitle = useMemo(() => {
    const label =
      candidate?.candidateName ||
      candidate?.inviteEmail ||
      `Candidate ${candidateSessionId}`;
    return `${label} — Submissions`;
  }, [candidate, candidateSessionId]);

  const subtitle = useMemo(() => {
    const bits: string[] = [];
    bits.push(`CandidateSession: ${candidateSessionId}`);
    if (candidate?.status) bits.push(`Status: ${candidate.status}`);
    if (candidate?.startedAt)
      bits.push(`Started: ${new Date(candidate.startedAt).toLocaleString()}`);
    if (candidate?.completedAt)
      bits.push(
        `Completed: ${new Date(candidate.completedAt).toLocaleString()}`,
      );
    return bits.join(' • ');
  }, [candidate, candidateSessionId]);

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

      {loading ? (
        <div className="text-sm text-gray-600">Loading submissions…</div>
      ) : error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-700">
          No submissions yet for this candidate.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((it) => {
            const artifact = artifacts[it.submissionId];
            return artifact ? (
              <ArtifactCard key={it.submissionId} artifact={artifact} />
            ) : (
              <div
                key={it.submissionId}
                className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-700"
              >
                Day {it.dayIndex} ({it.type}) — submission #{it.submissionId}{' '}
                content not available.
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
