export type SubmissionListItem = {
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

export type SubmissionListResponse = { items: SubmissionListItem[] };

export type SubmissionTestResults = {
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

export type SubmissionArtifact = {
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
