'use client';

import { useEffect, useMemo } from 'react';
import Button from '@/components/ui/Button';
import CandidateTaskView from '@/features/candidate/session/task/CandidateTaskView';
import CandidateTaskProgress from '@/features/candidate/session/task/CandidateTaskProgress';
import type { CandidateSessionBootstrapResponse } from '@/lib/api/candidate';
import { useCandidateSession } from './CandidateSessionProvider';
import { useCandidateBootstrap } from './hooks/useCandidateBootstrap';
import { useCurrentTask } from './hooks/useCurrentTask';
import { useTaskSubmission } from './hooks/useTaskSubmission';
import { deriveCurrentDayIndex } from './utils/taskTransforms';
import { StateMessage } from './components/StateMessage';

type ViewState = 'loading' | 'intro' | 'error' | 'starting' | 'running';

export default function CandidateSessionPageClient({
  token,
}: {
  token: string;
}) {
  const {
    state,
    setToken,
    setBootstrap,
    setStarted,
    setTaskLoading,
    setTaskLoaded,
    setTaskError,
    clearTaskError,
  } = useCandidateSession();

  const bootstrap = state.bootstrap as CandidateSessionBootstrapResponse | null;
  const title = useMemo(() => bootstrap?.simulation?.title ?? '', [bootstrap]);
  const role = useMemo(() => bootstrap?.simulation?.role ?? '', [bootstrap]);
  const candidateSessionId = bootstrap?.candidateSessionId ?? null;

  const {
    state: bootstrapState,
    errorMessage: bootstrapError,
    load: loadBootstrap,
  } = useCandidateBootstrap({
    token,
    onResolved: setBootstrap,
    onSetToken: setToken,
  });

  const { fetchCurrentTask } = useCurrentTask({
    token: state.token,
    candidateSessionId,
    setTaskLoading,
    setTaskLoaded,
    setTaskError,
    clearTaskError,
  });

  const { submitting, handleSubmit } = useTaskSubmission({
    token: state.token,
    candidateSessionId,
    currentTask: state.taskState.currentTask,
    clearTaskError,
    setTaskError,
    refreshTask: fetchCurrentTask,
  });

  useEffect(() => {
    if (state.token === token && state.bootstrap) return;
    void loadBootstrap();
  }, [loadBootstrap, state.bootstrap, state.started, state.token, token]);

  useEffect(() => {
    if (!state.started) return;
    if (!state.bootstrap) return;
    void fetchCurrentTask();
  }, [fetchCurrentTask, state.bootstrap, state.started]);

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

  const view: ViewState = useMemo(() => {
    if (bootstrapState === 'loading') return 'loading';
    if (bootstrapState === 'error') return 'error';
    if (!state.started) return 'intro';
    if (!state.bootstrap) return 'starting';
    if (state.taskState.loading) return 'starting';
    return 'running';
  }, [bootstrapState, state.bootstrap, state.started, state.taskState.loading]);

  const errorMessage = bootstrapError;

  if (view === 'loading') {
    return (
      <StateMessage
        title="Loading simulation…"
        description="Validating invite link."
      />
    );
  }

  if (view === 'error') {
    return (
      <StateMessage
        title="Unable to load simulation"
        description={errorMessage}
        action={<Button onClick={loadBootstrap}>Retry</Button>}
      />
    );
  }

  if (view === 'intro') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-2xl font-bold">{title}</div>
        <div className="text-sm text-gray-600 mt-1">Role: {role}</div>

        <div className="mt-6 space-y-2 text-sm text-gray-700">
          <p>You’re about to start a 5-day asynchronous work simulation.</p>
          <p>
            You’ll complete one task per day (design → code → debug → handoff →
            documentation).
          </p>
          <p>When you’re ready, click Start.</p>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            onClick={() => {
              setStarted(true);
            }}
          >
            Start simulation
          </Button>
        </div>
      </div>
    );
  }

  if (view === 'starting') {
    return (
      <StateMessage
        title="Starting…"
        description="Loading your current task."
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
