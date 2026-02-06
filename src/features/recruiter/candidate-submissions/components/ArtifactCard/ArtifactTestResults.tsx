'use client';
import type { SubmissionTestResults } from '../../types';
import { MiniStat } from './MiniStat';
import { Pre } from './Pre';
import { hasCounts } from './artifactUtils';

type Props = {
  testResults: SubmissionTestResults;
  showOutput: boolean;
  onToggleOutput: () => void;
};

export function ArtifactTestResults({
  testResults,
  showOutput,
  onToggleOutput,
}: Props) {
  return (
    <div className="mt-2 rounded border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-gray-900">Test results</div>
        {(testResults.stdout || testResults.stderr) && (
          <button
            type="button"
            className="text-[11px] text-blue-600 underline"
            onClick={onToggleOutput}
          >
            {showOutput ? 'Hide' : 'View'}
          </button>
        )}
      </div>
      {testResults.workflowRunId ? (
        <div className="text-[11px] text-gray-600">
          Run ID: {testResults.workflowRunId}
        </div>
      ) : null}
      {hasCounts(testResults) ? (
        <div className="mt-1 grid grid-cols-3 gap-2">
          <MiniStat label="Passed" value={testResults.passed} />
          <MiniStat label="Failed" value={testResults.failed} />
          <MiniStat label="Total" value={testResults.total} />
        </div>
      ) : null}
      {showOutput && (
        <div className="mt-2 space-y-2">
          {testResults.stdout ? (
            <Pre label="Output" value={testResults.stdout} />
          ) : null}
          {testResults.stderr ? (
            <Pre label="Errors" value={testResults.stderr} />
          ) : null}
        </div>
      )}
    </div>
  );
}
