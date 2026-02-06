'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import { RunTestsStats } from './RunTestsStats';
import { RunTestsOutput } from './RunTestsOutput';
import type { PollResult } from '../hooks/runTestsTypes';

type BodyProps = {
  message: string;
  statusLabel: string;
  statusTone: 'info' | 'success' | 'warning' | 'muted';
  result: PollResult | null;
};

export function RunTestsPanelBody({
  message,
  statusLabel,
  statusTone,
  result,
}: BodyProps) {
  const passed = result?.passed ?? null;
  const failed = result?.failed ?? null;
  const total =
    result?.total ??
    (passed !== null && failed !== null ? passed + failed : null);

  const workflowUrl = result?.workflowUrl ?? null;
  const commitSha = result?.commitSha ?? null;
  const shortCommit =
    commitSha && commitSha.length > 7 ? commitSha.slice(0, 7) : commitSha;

  return (
    <div className="mt-3 space-y-3 text-sm text-gray-700">
      <div role="status">{message}</div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label={statusLabel} tone={statusTone} />
        {workflowUrl ? (
          <a
            className="text-xs text-blue-600 hover:underline"
            href={workflowUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Workflow run
          </a>
        ) : null}
        {shortCommit ? (
          <div className="text-xs text-gray-600">
            Commit:{' '}
            <span className="font-mono" title={commitSha ?? undefined}>
              {shortCommit}
            </span>
          </div>
        ) : null}
      </div>

      <RunTestsStats passed={passed} failed={failed} total={total} />

      {result?.stdout || result?.stderr ? (
        <div className="space-y-2">
          <RunTestsOutput label="Stdout" content={result.stdout} />
          <RunTestsOutput label="Stderr" content={result.stderr} />
        </div>
      ) : null}
    </div>
  );
}
