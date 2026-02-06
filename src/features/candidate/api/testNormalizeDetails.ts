import { toNumberOrNull, toStringOrNull } from './base';
import { buildSources, pickFirst } from './runDetailPickers';
import type { CandidateTestRunStatusResponse } from './types';

export type CandidateTestRunDetails = Pick<
  CandidateTestRunStatusResponse,
  | 'passed'
  | 'failed'
  | 'total'
  | 'stdout'
  | 'stderr'
  | 'workflowUrl'
  | 'commitSha'
>;

const numberField = (sources: Record<string, unknown>[], keys: string[]) =>
  toNumberOrNull(pickFirst(sources, keys));

const stringField = (sources: Record<string, unknown>[], keys: string[]) =>
  toStringOrNull(pickFirst(sources, keys));

export const normalizeRunDetails = (
  rec: Record<string, unknown>,
): CandidateTestRunDetails => {
  const sources = buildSources(rec);

  const passed = numberField(sources, [
    'passed',
    'passedTests',
    'passed_tests',
    'testsPassed',
    'tests_passed',
  ]);
  const failed = numberField(sources, [
    'failed',
    'failedTests',
    'failed_tests',
    'testsFailed',
    'tests_failed',
  ]);
  let total = numberField(sources, [
    'total',
    'totalTests',
    'total_tests',
    'testsTotal',
    'tests_total',
  ]);
  if (total === null && passed !== null && failed !== null)
    total = passed + failed;

  const stdout = stringField(sources, [
    'stdout',
    'std_out',
    'testStdout',
    'test_stdout',
    'output',
    'logs',
  ]);
  const stderr = stringField(sources, [
    'stderr',
    'std_err',
    'testStderr',
    'test_stderr',
    'error_output',
    'errorOutput',
  ]);
  const workflowUrl = stringField(sources, [
    'workflowUrl',
    'workflow_url',
    'workflowRunUrl',
    'workflow_run_url',
    'runUrl',
    'run_url',
    'actionsUrl',
    'actions_url',
  ]);
  const commitSha = stringField(sources, [
    'commitSha',
    'commit_sha',
    'sha',
    'commit',
    'commitId',
    'commit_id',
  ]);

  return { passed, failed, total, stdout, stderr, workflowUrl, commitSha };
};
