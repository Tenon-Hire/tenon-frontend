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
import {
  INVITE_EXPIRED_MESSAGE,
  INVITE_UNAVAILABLE_MESSAGE,
} from '@/lib/copy/invite';
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
import { CandidateSessionSkeleton } from './components/CandidateSessionSkeleton';

type ViewState = 'loading' | 'auth' | 'starting' | 'error' | 'running';

const debugSession = ['1', 'true'].includes(
  (process.env.NEXT_PUBLIC_TENON_DEBUG_PERF ?? '').toLowerCase(),
);
function devDebug(message: string, ...args: unknown[]) {
  if (debugSession) {
    // eslint-disable-next-line no-console
    console.debug(`[candidate-session] ${message}`, ...args);
  }
}

function statusFromError(err: unknown): number | null {
  const status = (err as { status?: unknown })?.status;
  return typeof status === 'number' ? status : null;
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
  } = useCandidateSession();
  const router = useRouter();

  const bootstrap = state.bootstrap as CandidateSessionBootstrapResponse | null;
  const title = useMemo(() => bootstrap?.simulation?.title ?? '', [bootstrap]);
  const role = useMemo(() => bootstrap?.simulation?.role ?? '', [bootstrap]);
  const candidateSessionId =
    state.candidateSessionId ?? bootstrap?.candidateSessionId ?? null;

  const [view, setView] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
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
        setErrorStatus(statusFromError(err));
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
    setErrorStatus(null);
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
        setErrorMessage(INVITE_UNAVAILABLE_MESSAGE);
        setErrorStatus(400);
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
      setErrorStatus(null);
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
        const status = statusFromError(err);
        if (status === 401) {
          devDebug('token invalid', err);
          setToken(null);
          setAuthMessage('Please sign in again.');
          setErrorStatus(status);
          setView('auth');
          return;
        }
        if (status === 403) {
          setToken(null);
          setAuthMessage(friendlyBootstrapError(err));
          setErrorStatus(status);
          setView('auth');
          return;
        }
        setErrorStatus(status);
        setErrorMessage(friendlyBootstrapError(err));
        setView('error');
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
    setErrorStatus(null);
    void runInit(token, true);
  }, [runInit, token]);

  const goHome = useCallback(() => {
    router.push('/');
  }, [router]);

  const inviteLinkError =
    errorStatus === 400 ||
    errorStatus === 404 ||
    errorStatus === 409 ||
    errorStatus === 410;

  const inviteErrorCopy =
    errorMessage ??
    (errorStatus === 410 ? INVITE_EXPIRED_MESSAGE : INVITE_UNAVAILABLE_MESSAGE);
  const errorCopy = inviteLinkError
    ? inviteErrorCopy
    : (errorMessage ?? 'Something went wrong loading your simulation.');

  if (view === 'loading' || state.authStatus === 'loading') {
    return (
      <CandidateSessionSkeleton message="Checking your invite and signing you in." />
    );
  }

  if (view === 'error') {
    const errorTitle = inviteLinkError
      ? 'Invite link unavailable'
      : 'Unable to load simulation';
    const errorAction = inviteLinkError ? (
      <div className="flex gap-3">
        {state.authStatus === 'unauthenticated' ? (
          <a href={buildLoginHref('/', 'candidate')}>
            <Button>Go to sign in</Button>
          </a>
        ) : (
          <Button onClick={goHome}>Go to Home</Button>
        )}
      </div>
    ) : (
      <div className="flex gap-3">
        <Button onClick={retryInit}>Retry</Button>
      </div>
    );
    return (
      <StateMessage
        title={errorTitle}
        description={errorCopy}
        action={errorAction}
      />
    );
  }

  if (view === 'auth') {
    const loginHref = buildLoginHref(
      `/candidate/session/${encodeURIComponent(token)}`,
      'candidate',
    );
    return (
      <StateMessage
        title="Sign in to continue"
        description={authMessage ?? 'Redirecting you to sign in.'}
        action={
          <a href={loginHref}>
            <Button>Continue to sign in</Button>
          </a>
        }
      />
    );
  }

  if (view === 'starting') {
    return (
      <CandidateSessionSkeleton message="Loading your tasks and workspace." />
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
      <div className="mx-auto max-w-4xl space-y-5 p-6">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          <div className="text-sm text-gray-600">Role: {role}</div>
          <div className="text-xs text-gray-500">
            5-day simulation over 5 consecutive days. Each day runs 9:00 AM–5:00
            PM local time. Complete each day in order.
          </div>
        </div>

        <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
          <h2 className="text-sm font-semibold text-blue-900">
            What to expect
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-blue-900">
            <li>
              <b>Day 1:</b> architecture plan (written).
            </li>
            <li>
              <b>Days 2–3:</b> GitHub-native code tasks (repo + Codespaces +
              Actions).
            </li>
            <li>
              <b>Day 4:</b> handoff demo & presentation.
            </li>
            <li>
              <b>Day 5:</b> documentation & wrap-up.
            </li>
            <li>
              Schedule: 9:00 AM–5:00 PM local time, for 5 consecutive days.
            </li>
          </ul>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">
              How code tasks work
            </h2>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-gray-700">
              <li>
                Tenon provisions a GitHub repo from a template. You may be asked
                for your GitHub username to grant repo/Codespaces access.
              </li>
              <li>
                Open the repo in Codespaces (VS Code in the browser) from the
                workspace card — that’s your editor and terminal.
              </li>
              <li>
                Run tests from Tenon. We trigger GitHub Actions and show results
                back in this panel.
              </li>
              <li>
                Commit and submit from Tenon. We capture your latest commit SHA
                with your submission.
              </li>
            </ol>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-amber-900">
              Safety + setup
            </h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-amber-900">
              <li>Do not paste tokens or secrets into the UI or repo.</li>
              <li>Use the repo link provided; do not create your own repo.</li>
              <li>
                Use the Codespace link in the workspace card to open your editor
                and terminal.
              </li>
            </ul>
            <div className="mt-3 text-xs text-amber-900">
              Unsure where the editor/terminal is? Open Codespaces from the
              workspace card once it appears.
            </div>
          </div>
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">
            When you’re ready
          </div>
          <div className="mt-1 text-sm text-gray-700">
            Start Day 1 now. You can return anytime to continue where you left
            off.
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button onClick={handleStart}>Start simulation</Button>
            <Button
              variant="secondary"
              onClick={() => router.push('/candidate/dashboard')}
            >
              Back to Candidate Dashboard
            </Button>
          </div>
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
          <RunTestsPanel
            onStart={handleStartTests}
            onPoll={handlePollTests}
            storageKey={`tenon:taskRun:${currentTask.id}`}
          />
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
        <div className="space-y-3 rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
          <div className="text-base font-semibold text-gray-900">
            Unable to load your session
          </div>
          <div className="text-sm text-gray-600">
            We couldn’t fetch your current task. Retry to refresh your
            workspace, or head back to the candidate dashboard to reopen your
            invite.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void fetchCurrentTask()}>Retry</Button>
            <Button
              variant="secondary"
              onClick={() => router.push('/candidate/dashboard')}
            >
              Back to dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
