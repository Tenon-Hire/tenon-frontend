export type RunState =
  | 'idle'
  | 'starting'
  | 'running'
  | 'success'
  | 'failed'
  | 'timeout'
  | 'error';
export type PollResultStatus =
  | 'running'
  | 'passed'
  | 'failed'
  | 'timeout'
  | 'error';

export type PollResult = {
  status: PollResultStatus;
  message?: string;
  passed: number | null;
  failed: number | null;
  total: number | null;
  stdout: string | null;
  stderr: string | null;
  workflowUrl: string | null;
  commitSha: string | null;
};

export type RunTestsArgs = {
  onStart: () => Promise<{ runId: string }>;
  onPoll: (runId: string) => Promise<PollResult>;
  storageKey?: string;
  pollIntervalMs?: number;
  maxAttempts?: number;
  maxPollIntervalMs?: number;
  maxDurationMs?: number;
};
