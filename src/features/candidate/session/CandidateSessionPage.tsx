'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAccessToken as fetchAccessToken,
  useUser,
} from '@auth0/nextjs-auth0/client';
import Button from '@/components/ui/Button';
import { buildLogoutHref } from '@/features/auth/authPaths';
import CandidateTaskView from '@/features/candidate/session/task/CandidateTaskView';
import CandidateTaskProgress from '@/features/candidate/session/task/CandidateTaskProgress';
import {
  claimCandidateInvite,
  type CandidateSessionBootstrapResponse,
  getCandidateCurrentTask,
} from '@/lib/api/candidate';
import { getUserEmail } from '@/lib/auth0-claims';
import { useCandidateSession } from './CandidateSessionProvider';
import { useTaskSubmission } from './hooks/useTaskSubmission';
import {
  deriveCurrentDayIndex,
  normalizeCompletedTaskIds,
  toTask,
} from './utils/taskTransforms';
import { StateMessage } from './components/StateMessage';
import { friendlyClaimError, friendlyTaskError } from './utils/errorMessages';

type ViewState = 'loading' | 'starting' | 'error' | 'wrong_account' | 'running';

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
    setVerifiedEmail,
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
  const { user } = useUser();

  const bootstrap = state.bootstrap as CandidateSessionBootstrapResponse | null;
  const title = useMemo(() => bootstrap?.simulation?.title ?? '', [bootstrap]);
  const role = useMemo(() => bootstrap?.simulation?.role ?? '', [bootstrap]);
  const candidateSessionId =
    state.candidateSessionId ?? bootstrap?.candidateSessionId ?? null;

  const profileEmail = useMemo(
    () => getUserEmail(user as Record<string, unknown> | null),
    [user],
  );
  const signedInEmail = profileEmail ?? state.verifiedEmail ?? null;

  const [view, setView] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [claimMismatchEmail, setClaimMismatchEmail] = useState<string | null>(
    null,
  );
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
    setClaimMismatchEmail(null);
    setErrorMessage(null);
    setView('loading');
    clearTaskError();
    if (state.inviteToken !== token) {
      setInviteToken(token);
    }
  }, [clearTaskError, reset, setInviteToken, state.inviteToken, token]);

  const runInit = useCallback(
    async (initToken: string, allowRetry = false) => {
      if (!initToken) {
        setErrorMessage('Missing invite token.');
        setView('error');
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
      setClaimMismatchEmail(null);
      devDebug('init start', { token: initToken });

      let authToken: string;
      try {
        authToken = await fetchAccessToken();
        setToken(authToken);
      } catch {
        setErrorMessage(
          'Unable to load your login session. Please sign in again.',
        );
        setView('error');
        initRef.current.inFlight = false;
        initRef.current.done = true;
        return;
      }

      try {
        const resp = await claimCandidateInvite(initToken, authToken);
        devDebug('claim success', { sessionId: resp.candidateSessionId });
        const verified =
          profileEmail ?? resp.signedInEmail ?? state.verifiedEmail;
        if (verified) setVerifiedEmail(verified);
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
          devDebug('claim mismatch', err);
          const invitedEmail = (err as { invitedEmail?: unknown }).invitedEmail;
          setClaimMismatchEmail(
            typeof invitedEmail === 'string' && invitedEmail.trim()
              ? invitedEmail
              : null,
          );
          setErrorMessage(friendlyClaimError(err));
          setView('wrong_account');
        } else {
          setErrorMessage(friendlyClaimError(err));
          setView('error');
        }
        initRef.current.done = true;
        initRef.current.inFlight = false;
        return;
      }

      initRef.current.inFlight = false;
    },
    [
      clearTaskError,
      profileEmail,
      setBootstrap,
      setCandidateSessionId,
      setToken,
      setVerifiedEmail,
      state.verifiedEmail,
    ],
  );

  useEffect(() => {
    void runInit(token);
  }, [runInit, token]);

  useEffect(() => {
    if (view === 'wrong_account' || view === 'error') return;
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

  const completedCount = state.taskState.completedTaskIds.length;
  const currentDayIndex = useMemo(
    () =>
      deriveCurrentDayIndex(
        completedCount,
        state.taskState.currentTask,
        state.taskState.isComplete,
      ),
    [completedCount, state.taskState.currentTask, state.taskState.isComplete],
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

  const retryInit = useCallback(() => {
    initRef.current = { token: null, inFlight: false, done: false };
    setView('loading');
    setErrorMessage(null);
    void runInit(token, true);
  }, [runInit, token]);

  const errorCopy =
    errorMessage ?? 'Something went wrong loading your simulation.';

  if (view === 'loading') {
    return (
      <StateMessage
        title="Loading simulation…"
        description="Validating your invite link."
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

  if (view === 'wrong_account') {
    const invited = claimMismatchEmail;
    const returnTo = `/candidate/session/${encodeURIComponent(token)}`;
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4">
        <div>
          <div className="text-2xl font-semibold">Use the invited email</div>
          <div className="text-sm text-gray-600">
            {title ? `${title} — ${role}` : 'Simulation invite'}
          </div>
        </div>
        <p className="text-sm text-gray-700">
          {invited
            ? `This invite was sent to ${invited}. You’re signed in as ${
                signedInEmail ?? 'a different account'
              }.`
            : `This invite was sent to a different email than the one you’re signed in with. You’re signed in as ${
                signedInEmail ?? 'another account'
              }.`}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => router.push(buildLogoutHref(returnTo))}>
            Log out
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/candidate/dashboard')}
          >
            Go to Candidate Dashboard
          </Button>
        </div>
        <button
          className="text-sm text-blue-700 underline"
          onClick={() => router.push(buildLogoutHref(returnTo))}
        >
          Try a different account
        </button>
      </div>
    );
  }

  if (view === 'starting') {
    return (
      <StateMessage
        title={title || 'Preparing your simulation…'}
        description="Claiming your invite and loading tasks."
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
          Claiming your invite was successful. When you’re ready, start your
          simulation to begin Day 1. You can come back anytime to resume.
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

      {state.taskState.currentTask && candidateSessionId !== null ? (
        <CandidateTaskView
          task={state.taskState.currentTask}
          candidateSessionId={candidateSessionId}
          submitting={submitting}
          submitError={state.taskState.error}
          onSubmit={handleSubmit}
        />
      ) : state.taskState.currentTask ? (
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
