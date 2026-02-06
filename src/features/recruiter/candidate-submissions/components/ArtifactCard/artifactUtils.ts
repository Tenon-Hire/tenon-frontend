import type { SubmissionTestResults } from '../../types';

export function hasCounts(results: SubmissionTestResults | null) {
  if (!results) return false;
  const { passed, failed, total } = results;
  return [passed, failed, total].some((v) => v !== null && v !== undefined);
}

export function formatDiffSummary(summary: unknown): string | null {
  if (!summary || typeof summary !== 'object') return null;
  const entries = Object.entries(summary as Record<string, unknown>).filter(
    ([, value]) => value !== null && value !== undefined,
  );
  if (!entries.length) return null;
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(', ');
}
