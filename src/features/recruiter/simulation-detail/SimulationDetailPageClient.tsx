'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { CandidateStatusPill } from '@/features/recruiter/components/CandidateStatusPill';
import { toUserMessage } from '@/lib/utils/errors';
import type { CandidateSession } from '@/features/recruiter/types';

export default function SimulationDetailPageClient() {
  const params = useParams<{ id: string }>();
  const simulationId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateSession[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/simulations/${simulationId}/candidates`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!res.ok) {
          const maybeJson: unknown = await res.json().catch(() => null);
          const fallbackText = await res.text().catch(() => '');
          const msg =
            maybeJson !== null
              ? toUserMessage(maybeJson, 'Request failed', {
                  includeDetail: true,
                })
              : fallbackText;
          throw new Error(msg || `Failed to load candidates (${res.status})`);
        }

        const data = (await res.json()) as CandidateSession[];
        if (!cancelled) setCandidates(Array.isArray(data) ? data : []);
      } catch (e: unknown) {
        if (!cancelled)
          setError(toUserMessage(e, 'Request failed', { includeDetail: true }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [simulationId]);

  const rows = useMemo(() => candidates ?? [], [candidates]);

  return (
    <div className="flex flex-col gap-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Simulation"
          subtitle={`Simulation ID: ${simulationId}`}
        />
        <Link
          className="text-sm text-blue-600 hover:underline"
          href="/dashboard"
        >
          ← Back to dashboard
        </Link>
      </div>

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
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((c) => {
                const display = c.candidateName || c.inviteEmail || 'Unnamed';
                return (
                  <tr key={c.candidateSessionId}>
                    <td className="px-4 py-3">
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

                    <td className="px-4 py-3">
                      <CandidateStatusPill status={c.status} />
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {c.startedAt
                        ? new Date(c.startedAt).toLocaleString()
                        : '—'}
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {c.completedAt
                        ? new Date(c.completedAt).toLocaleString()
                        : '—'}
                    </td>

                    <td className="px-4 py-3 text-right">
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
    </div>
  );
}
