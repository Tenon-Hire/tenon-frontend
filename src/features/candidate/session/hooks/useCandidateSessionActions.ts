import { useMemo } from 'react';
import { useRunInit } from './useRunInit';
import { useTaskAutoload } from './useTaskAutoload';
import { useAuthRedirect } from './useAuthRedirect';
import { useCandidateInviteActions } from './useCandidateInviteActions';
import { useCandidateTaskActions } from './useCandidateTaskActions';
import { useCandidateTestActions } from './useCandidateTestActions';
import type { SessionActionsParams as Params } from './useCandidateSessionActions.types';

export function useCandidateSessionActions({
  session,
  token,
  view,
  setView,
  setErrorMessage,
  setErrorStatus,
  setAuthMessage,
  markStart,
  markEnd,
}: Params) {
  const taskActions = useCandidateTaskActions({ session, markStart, markEnd });

  const inviteActions = useCandidateInviteActions({
    token,
    session,
    setView,
    setAuthMessage,
    setErrorMessage,
    setErrorStatus,
    fetchCurrentTask: taskActions.fetchCurrentTask,
    markStart,
    markEnd,
  });

  const testActions = useCandidateTestActions({ session });

  useRunInit(inviteActions.runInit, token);
  useTaskAutoload({
    view,
    state: session.state,
    fetchCurrentTask: taskActions.fetchCurrentTask,
    setErrorMessage,
    setView,
  });
  useAuthRedirect({
    authStatus: session.state.authStatus,
    token,
    loginHref: inviteActions.loginHref,
  });

  return useMemo(
    () => ({
      ...taskActions,
      ...inviteActions,
      ...testActions,
    }),
    [inviteActions, taskActions, testActions],
  );
}
