import type { CandidateTask } from '../CandidateSessionProvider';
import type { SubmitPayload, SubmitResponse } from '../task/types';
import type { PollResult } from '../task/hooks/runTestsTypes';

export type ViewState = 'loading' | 'auth' | 'starting' | 'error' | 'running';

export type CandidateSessionScreenProps = {
  view: ViewState;
  authStatus: 'idle' | 'loading' | 'ready' | 'unauthenticated' | 'error';
  authMessage: string | null;
  title: string;
  role: string;
  errorMessage: string | null;
  errorStatus: number | null;
  inviteErrorCopy: string;
  isComplete: boolean;
  started: boolean;
  currentDayIndex: number;
  completedCount: number;
  currentTask: CandidateTask | null;
  submitting: boolean;
  taskError: string | null;
  taskLoading: boolean;
  resourceLink: string | null;
  candidateSessionId: number | null;
  authToken: string | null;
  showWorkspacePanel: boolean;
  showRecordingPanel: boolean;
  showDocsPanel: boolean;
  loginHref: string;
  onStart: () => void;
  onDashboard: () => void;
  onRetryInit: () => void;
  onGoHome: () => void;
  onRetryTask: () => void;
  onSubmit: (
    payload: SubmitPayload,
  ) => Promise<SubmitResponse | void> | SubmitResponse | void;
  onStartTests: () => Promise<{ runId: string }>;
  onPollTests: (runId: string) => Promise<PollResult>;
};
