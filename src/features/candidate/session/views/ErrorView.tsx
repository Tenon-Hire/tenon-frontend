import Button from '@/components/ui/Button';
import { StateMessage } from '../components/StateMessage';

type Props = {
  authStatus: 'idle' | 'loading' | 'ready' | 'unauthenticated' | 'error';
  errorTitle: string;
  errorCopy: string;
  inviteLinkError: boolean;
  loginHref: string;
  onRetry: () => void;
  onGoHome: () => void;
};

export function ErrorView({
  authStatus,
  errorTitle,
  errorCopy,
  inviteLinkError,
  loginHref,
  onRetry,
  onGoHome,
}: Props) {
  const action = inviteLinkError ? (
    <div className="flex gap-3">
      {authStatus === 'unauthenticated' ? (
        <a href={loginHref}>
          <Button>Go to sign in</Button>
        </a>
      ) : (
        <Button onClick={onGoHome}>Go to Home</Button>
      )}
    </div>
  ) : (
    <div className="flex gap-3">
      <Button onClick={onRetry}>Retry</Button>
    </div>
  );

  return (
    <StateMessage title={errorTitle} description={errorCopy} action={action} />
  );
}
