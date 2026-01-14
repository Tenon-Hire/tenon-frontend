'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import CandidateTaskView from '@/features/candidate/session/task/CandidateTaskView';
import CandidateTaskProgress from '@/features/candidate/session/task/CandidateTaskProgress';
import { RunTestsPanel } from '@/features/candidate/session/task/components/RunTestsPanel';
import { WorkspacePanel } from '@/features/candidate/session/task/components/WorkspacePanel';
import { ResourcePanel } from '@/features/candidate/session/task/components/ResourcePanel';
import {
  type CandidateSessionBootstrapResponse,
  getCandidateCurrentTask,
  pollCandidateTestRun,
  resolveCandidateInviteToken,
  startCandidateTestRun,
} from '@/lib/api/candidate';
import { buildLoginHref } from '@/features/auth/authPaths';
import { useCandidateSession } from './CandidateSessionProvider';
import { useTaskSubmission } from './hooks/useTaskSubmission';
import {
  deriveCurrentDayIndex,
  normalizeCompletedTaskIds,
  toTask,
} from './utils/taskTransforms';
import { StateMessage } from './components/StateMessage';
import {
  friendlyBootstrapError,
  friendlyTaskError,
} from './utils/errorMessages';
import { extractFirstUrl } from './utils/extractUrl';

type ViewState = 'loading' | 'auth' | 'starting' | 'error' | 'running';

const isDev = process.env.NODE_ENV === 'development';
function devDebug(message: string, ...args: unknown[]) {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.debug(`[candidate-session] ${message}`, ...args);
  }
}

export default function CandidateSessionPage({ token }: { token: string }) {
  const {
    state,
    setInviteToken,
    setToken,
    setCandidateSessionId,
    setBootstrap,
    setStarted,
    setTaskLoading,
    setTaskLoaded,
    setTaskError,
    clearTaskError,
    reset,
    loadAccessToken,
  } = useCandidateSession();
  const router = useRouter();

  const bootstrap = state.bootstrap as CandidateSessionBootstrapResponse | null;
  const title = useMemo(() => bootstrap?.simulation?.title ?? '', [bootstrap]);
  const role = useMemo(() => bootstrap?.simulation?.role ?? '', [bootstrap]);
  const candidateSessionId =
    state.candidateSessionId ?? bootstrap?.candidateSessionId ?? null;

  const [view, setView] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const lastTokenRef = useRef<string | null>(null);
  const initRef = useRef<{
    token: string | null;
    inFlight: boolean;
    done: boolean;
  }>({ token: null, inFlight: false, done: false });

  const taskInFlightRef = useRef(false);

  const fetchCurrentTask = useCallback(
    async (overrides?: {
      authToken?: string;
      candidateSessionId?: number;
    }): Promise<void> => {
      const authToken = overrides?.authToken ?? state.token;
      const sessionId = overrides?.candidateSessionId ?? candidateSessionId;
      if (!authToken || !sessionId) return;
      if (taskInFlightRef.current) return;

      taskInFlightRef.current = true;
      devDebug('task fetch start', {
        sessionId,
        token: authToken ? 'present' : 'missing',
      });
      clearTaskError();
      setTaskLoading();

      try {
        const dto = await getCandidateCurrentTask(sessionId, authToken);
        setTaskLoaded({
          isComplete: Boolean(dto.isComplete),
          completedTaskIds: normalizeCompletedTaskIds(dto),
          currentTask: toTask(dto.currentTask),
        });
        devDebug('task fetch success', { sessionId });
      } catch (err) {
        setTaskError(friendlyTaskError(err));
        devDebug('task fetch failed', err);
        throw err;
      } finally {
        taskInFlightRef.current = false;
      }
    },
    [
      candidateSessionId,
      clearTaskError,
      setTaskError,
      setTaskLoaded,
      setTaskLoading,
      state.token,
    ],
  );

  const { submitting, handleSubmit } = useTaskSubmission({
    token: state.token,
    candidateSessionId,
    currentTask: state.taskState.currentTask,
    clearTaskError,
    setTaskError,
    refreshTask: fetchCurrentTask,
  });

  useEffect(() => {
    if (lastTokenRef.current === token) return;
    lastTokenRef.current = token;

    if (state.inviteToken && state.inviteToken !== token) {
      reset();
    }
    initRef.current = { token: null, inFlight: false, done: false };
    setErrorMessage(null);
    setAuthMessage(null);
    setView('loading');
    clearTaskError();
    if (state.inviteToken !== token) {
      setInviteToken(token);
    }
  }, [clearTaskError, reset, setInviteToken, state.inviteToken, token]);

  const runInit = useCallback(
    async (
      initToken: string,
      allowRetry = false,
      authTokenOverride?: string | null,
    ) => {
      if (!initToken) {
        setErrorMessage('Missing invite token.');
        setView('error');
        return;
      }

      const authToken = authTokenOverride ?? state.token;
      if (!authToken) {
        setView('auth');
        return;
      }

      if (
        !allowRetry &&
        initRef.current.inFlight &&
        initRef.current.token === initToken
      ) {
        return;
      }

      if (
        !allowRetry &&
        initRef.current.done &&
        initRef.current.token === initToken
      ) {
        return;
      }

      initRef.current = { token: initToken, inFlight: true, done: false };
      setView('loading');
      setErrorMessage(null);
      setAuthMessage(null);
      devDebug('init start', { token: initToken });

      try {
        const resp = await resolveCandidateInviteToken(initToken, authToken);
        devDebug('bootstrap success', { sessionId: resp.candidateSessionId });
        setCandidateSessionId(resp.candidateSessionId);
        setBootstrap({
          candidateSessionId: resp.candidateSessionId,
          status: resp.status,
          simulation: resp.simulation,
        });
        clearTaskError();
        setView('starting');
        initRef.current.done = true;
      } catch (err) {
        const status = (err as { status?: unknown }).status;
        if (status === 401 || status === 403) {
          devDebug('token invalid', err);
          setToken(null);
          setAuthMessage('Your session expired. Please sign in again.');
          setView('auth');
          void loadAccessToken();
        } else {
          setErrorMessage(friendlyBootstrapError(err));
          setView('error');
        }
        initRef.current.done = true;
      } finally {
        initRef.current.inFlight = false;
      }
    },
    [
      clearTaskError,
      setBootstrap,
      setCandidateSessionId,
      setToken,
      state.token,
      loadAccessToken,
    ],
  );

  useEffect(() => {
    void runInit(token);
  }, [runInit, token]);

  useEffect(() => {
    if (view === 'auth' || view === 'error') return;
    if (!state.token || !candidateSessionId) return;
    if (state.taskState.loading) return;
    if (state.taskState.isComplete) return;
    if (state.taskState.currentTask) return;
    setView((prev) => (prev === 'loading' ? 'starting' : 'running'));
    void fetchCurrentTask().catch((err) => {
      setErrorMessage(friendlyTaskError(err));
      setView('error');
    });
  }, [
    candidateSessionId,
    fetchCurrentTask,
    state.taskState.currentTask,
    state.taskState.isComplete,
    state.taskState.loading,
    state.token,
    view,
  ]);

  const currentTask = state.taskState.currentTask;
  const completedCount = state.taskState.completedTaskIds.length;
  const isComplete = state.taskState.isComplete;
  const currentDayIndex = useMemo(
    () => deriveCurrentDayIndex(completedCount, currentTask, isComplete),
    [completedCount, currentTask, isComplete],
  );

  const showWorkspacePanel = Boolean(
    currentTask && (currentTask.dayIndex === 2 || currentTask.dayIndex === 3),
  );
  const showRecordingPanel =
    currentTask?.dayIndex === 4 || currentTask?.type === 'handoff';
  const showDocsPanel =
    currentTask?.dayIndex === 5 || currentTask?.type === 'documentation';

  const resourceLink = useMemo(
    () => extractFirstUrl(currentTask?.description ?? null),
    [currentTask?.description],
  );

  const handleStartTests = useCallback(async () => {
    if (!candidateSessionId || !state.token || !currentTask) {
      throw new Error('Missing session context.');
    }
    return startCandidateTestRun({
      taskId: currentTask.id,
      token: state.token,
      candidateSessionId,
    });
  }, [candidateSessionId, currentTask, state.token]);

  const handlePollTests = useCallback(
    async (runId: string) => {
      if (!candidateSessionId || !state.token || !currentTask) {
        throw new Error('Missing session context.');
      }
      return pollCandidateTestRun({
        taskId: currentTask.id,
        runId,
        token: state.token,
        candidateSessionId,
      });
    },
    [candidateSessionId, currentTask, state.token],
  );

  const handleStart = useCallback(() => {
    setStarted(true);
    if (!state.taskState.currentTask) {
      void fetchCurrentTask().catch((err) => {
        setErrorMessage(friendlyTaskError(err));
        setView('error');
      });
    }
  }, [
    fetchCurrentTask,
    setErrorMessage,
    setStarted,
    setView,
    state.taskState.currentTask,
  ]);

  useEffect(() => {
    if (state.authStatus !== 'unauthenticated') return;
    const returnTo = `/candidate/session/${encodeURIComponent(token)}`;
    router.replace(buildLoginHref(returnTo, 'candidate'));
  }, [router, state.authStatus, token]);

  const retryInit = useCallback(() => {
    initRef.current = { token: null, inFlight: false, done: false };
    setView('loading');
    setErrorMessage(null);
    void runInit(token, true);
  }, [runInit, token]);

  const errorCopy =
    errorMessage ?? 'Something went wrong loading your simulation.';

  if (view === 'loading' || state.authStatus === 'loading') {
    return (
      <StateMessage
        title="Loading simulation…"
        description="Checking your session and invite link."
      />
    );
  }

  if (view === 'error') {
    return (
      <StateMessage
        title="Unable to load simulation"
        description={errorCopy}
        action={
          <div className="flex gap-3">
            <Button onClick={retryInit}>Retry</Button>
          </div>
        }
      />
    );
  }

  if (view === 'auth') {
    return (
      <StateMessage
        title="Sign in to continue"
        description={authMessage ?? 'Redirecting you to sign in.'}
      />
    );
  }

  if (view === 'starting') {
    return (
      <StateMessage
        title={title || 'Preparing your simulation…'}
        description="Loading your tasks and workspace."
      />
    );
  }

  if (state.taskState.isComplete) {
    return (
      <StateMessage
        title="Simulation complete 🎉"
        description="You’ve submitted all 5 days. You can close this tab now."
      />
    );
  }

  if (!state.started) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-sm text-gray-600">Role: {role}</div>
        </div>
        <div className="text-sm text-gray-700">
          You’re signed in. When you’re ready, start your simulation to begin
          Day 1. You can come back anytime to resume.
        </div>
        <div className="flex gap-3">
          <Button onClick={handleStart}>Start simulation</Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/candidate/dashboard')}
          >
            Back to Candidate Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xl font-bold">{title}</div>
          <div className="text-sm text-gray-600">Role: {role}</div>
        </div>
        {state.taskState.loading ? (
          <div className="text-sm text-gray-500">Refreshing…</div>
        ) : null}
      </div>

      <CandidateTaskProgress
        completedCount={completedCount}
        currentDayIndex={currentDayIndex}
        currentTaskTitle={currentTask?.title ?? null}
      />

      {state.taskState.error ? (
        <div className="border rounded-md p-3 bg-red-50 text-sm text-red-800">
          {state.taskState.error}{' '}
          <button
            className="underline ml-2"
            onClick={() => void fetchCurrentTask()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {showWorkspacePanel && candidateSessionId !== null && currentTask ? (
        <div className="grid gap-3 md:grid-cols-2">
          <WorkspacePanel
            taskId={currentTask.id}
            candidateSessionId={candidateSessionId}
            token={state.token}
            dayIndex={currentTask.dayIndex}
          />
          <RunTestsPanel onStart={handleStartTests} onPoll={handlePollTests} />
        </div>
      ) : null}

      {showRecordingPanel ? (
        <ResourcePanel
          title="Day 4 recording"
          description="Record a short walkthrough covering your decisions."
          linkUrl={resourceLink}
          linkLabel="Open recording link"
          emptyMessage="Look for the recording link in your prompt."
        />
      ) : null}

      {showDocsPanel ? (
        <ResourcePanel
          title="Day 5 documentation"
          description="Capture your final notes and next steps."
          linkUrl={resourceLink}
          linkLabel="Open documentation link"
          emptyMessage="Look for the documentation link in your prompt."
        />
      ) : null}

      {currentTask && candidateSessionId !== null ? (
        <CandidateTaskView
          task={currentTask}
          submitting={submitting}
          submitError={state.taskState.error}
          onSubmit={handleSubmit}
        />
      ) : currentTask ? (
        <div className="border rounded-md p-4 text-sm text-gray-700">
          Session not ready. Please refresh.
        </div>
      ) : (
        <div className="border rounded-md p-4 text-sm text-gray-700">
          No current task available.
        </div>
      )}
    </div>
  );
}
