import { toStringOrNull, toIdString } from './base';
import { normalizeRunDetails } from './testNormalizeDetails';
import type {
  CandidateTestRunStartResponse,
  CandidateTestRunStatusResponse,
} from './types';

export const normalizeRunStatus = (
  data: unknown,
): CandidateTestRunStatusResponse => {
  if (!data || typeof data !== 'object') {
    return {
      status: 'error',
      passed: null,
      failed: null,
      total: null,
      stdout: null,
      stderr: null,
      workflowUrl: null,
      commitSha: null,
    };
  }
  const rec = data as Record<string, unknown>;
  const details = normalizeRunDetails(rec);
  const status = String(rec.status ?? '').toLowerCase();
  const conclusion = String(rec.conclusion ?? '').toLowerCase();
  const timeout =
    rec.timeout === true ||
    status === 'timed_out' ||
    conclusion === 'timed_out';
  if (timeout)
    return {
      status: 'timeout',
      message: toStringOrNull(rec.message) ?? undefined,
      ...details,
    };
  if (status === 'running' || status === 'in_progress' || status === 'queued')
    return {
      status: 'running',
      message: toStringOrNull(rec.message) ?? undefined,
      ...details,
    };
  if (conclusion === 'success' || status === 'passed' || status === 'success')
    return {
      status: 'passed',
      message: toStringOrNull(rec.message) ?? undefined,
      ...details,
    };
  if (conclusion === 'failure' || status === 'failed' || status === 'failure')
    return {
      status: 'failed',
      message: toStringOrNull(rec.message) ?? undefined,
      ...details,
    };
  return {
    status: 'error',
    message: toStringOrNull(rec.message) ?? undefined,
    ...details,
  };
};

export const normalizeRunId = (
  data: unknown,
): CandidateTestRunStartResponse | null => {
  if (!data || typeof data !== 'object') return null;
  const rec = data as Record<string, unknown>;
  const runId = toIdString(rec.runId ?? rec.run_id ?? rec.id);
  return runId ? { runId } : null;
};
