import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCandidateSession } from '../CandidateSessionProvider';
import { usePerfMarks } from './usePerfMarks';
import { useCandidateDerivedInfo } from './useCandidateDerivedInfo';
import { useTokenSync } from './useTokenSync';
import { useCandidateSessionActions } from './useCandidateSessionActions';
import type { ViewState } from '../CandidateSessionScreen';

export function useCandidateSessionController(token: string) {
  const session = useCandidateSession();
  const router = useRouter();
  const { markStart, markEnd } = usePerfMarks();
  const [view, setView] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setErrorMessage(null);
    setErrorStatus(null);
    setAuthMessage(null);
    setView('loading');
    session.clearTaskError();
    if (typeof session.reset === 'function') session.reset();
  }, [session]);

  useTokenSync({
    token,
    inviteToken: session.state.inviteToken,
    setInviteToken: session.setInviteToken,
    setCandidateSessionId: session.setCandidateSessionId,
    onReset: reset,
  });

  const actions = useCandidateSessionActions({
    session,
    token,
    view,
    setView,
    setErrorMessage,
    setErrorStatus,
    setAuthMessage,
    markStart,
    markEnd,
  });

  const handleStart = useCallback(() => {
    session.setStarted(true);
    if (!session.state.taskState.currentTask) {
      void actions.fetchCurrentTask().catch(() => setView('error'));
    }
  }, [actions, session]);

  const derived = useCandidateDerivedInfo(
    session.state,
    errorStatus,
    errorMessage,
  );

  const resolvedView: ViewState =
    (view === 'loading' || view === 'starting') &&
    (session.state.taskState.isComplete || session.state.taskState.currentTask)
      ? 'running'
      : view;

  return {
    view: resolvedView,
    authStatus: session.state.authStatus,
    authMessage,
    errorMessage,
    errorStatus,
    loginHref: actions.loginHref,
    ...derived,
    started: session.state.started,
    submitting: actions.submitting,
    taskError: session.state.taskState.error,
    authToken: session.state.token,
    candidateSessionId: session.state.candidateSessionId,
    taskLoading: session.state.taskState.loading,
    onStart: handleStart,
    onDashboard: () => router.push('/candidate/dashboard'),
    onRetryInit: () => actions.runInit(token, true),
    onGoHome: () => router.push('/'),
    onRetryTask: () => actions.fetchCurrentTask(undefined, { skipCache: true }),
    onSubmit: actions.handleSubmit,
    onStartTests: actions.handleStartTests,
    onPollTests: actions.handlePollTests,
  };
}
