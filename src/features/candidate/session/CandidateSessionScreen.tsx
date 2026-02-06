import { AuthView } from './views/AuthView';
import { CompleteView } from './views/CompleteView';
import { ErrorView } from './views/ErrorView';
import { LoadingView } from './views/LoadingView';
import { RunningView } from './views/RunningView';
import { StartView } from './views/StartView';
import type {
  CandidateSessionScreenProps as Props,
  ViewState,
} from './views/types';

export type { ViewState };

export function CandidateSessionScreen(props: Props) {
  const {
    view,
    authStatus,
    authMessage,
    errorMessage,
    errorStatus,
    inviteErrorCopy,
  } = props;
  if (view === 'loading')
    return <LoadingView message="Checking your invite and signing you in." />;
  if (view === 'auth')
    return <AuthView loginHref={props.loginHref} message={authMessage} />;
  if (view === 'starting')
    return <LoadingView message="Loading your tasks and workspace." />;

  if (view === 'error') {
    const inviteLinkError = [400, 404, 409, 410].includes(errorStatus ?? 0);
    const errorTitle = inviteLinkError
      ? 'Invite link unavailable'
      : 'Unable to load simulation';
    const errorCopy = inviteLinkError
      ? inviteErrorCopy
      : (errorMessage ?? 'Something went wrong loading your simulation.');
    return (
      <ErrorView
        authStatus={authStatus}
        errorTitle={errorTitle}
        errorCopy={errorCopy}
        inviteLinkError={inviteLinkError}
        loginHref={props.loginHref}
        onRetry={props.onRetryInit}
        onGoHome={props.onGoHome}
      />
    );
  }

  if (props.isComplete) return <CompleteView />;
  if (!props.started)
    return (
      <StartView
        title={props.title}
        role={props.role}
        onStart={props.onStart}
        onDashboard={props.onDashboard}
      />
    );

  return (
    <RunningView
      title={props.title}
      role={props.role}
      completedCount={props.completedCount}
      currentDayIndex={props.currentDayIndex}
      currentTask={props.currentTask}
      candidateSessionId={props.candidateSessionId}
      authToken={props.authToken}
      taskError={props.taskError}
      taskLoading={props.taskLoading}
      resourceLink={props.resourceLink}
      submitting={props.submitting}
      showWorkspacePanel={props.showWorkspacePanel}
      showRecordingPanel={props.showRecordingPanel}
      showDocsPanel={props.showDocsPanel}
      onRetryTask={props.onRetryTask}
      onSubmit={props.onSubmit}
      onStartTests={props.onStartTests}
      onPollTests={props.onPollTests}
      onDashboard={props.onDashboard}
    />
  );
}
