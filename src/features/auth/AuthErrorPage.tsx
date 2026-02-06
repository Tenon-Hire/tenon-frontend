import Button from '@/shared/ui/Button';
import LoginLink from '@/features/auth/LoginLink';
import { AuthPageLayout } from './AuthPageLayout';
import { buildClearAuthHref, type LoginMode } from './authPaths';

type AuthErrorPageProps = {
  returnTo?: string;
  mode?: LoginMode;
  error?: string | null;
  errorCode?: string | null;
  errorId?: string | null;
  cleared?: boolean;
};

const toFriendlyMessage = (errorCode?: string | null) => {
  if (!errorCode) {
    return 'We could not complete your sign-in. Please try again.';
  }
  const lowered = errorCode.toLowerCase();
  if (lowered.includes('state')) {
    return 'Your sign-in session expired or was interrupted. Please try again.';
  }
  if (lowered.includes('nonce')) {
    return 'We could not verify your sign-in session. Please try again.';
  }
  return 'We could not complete your sign-in. Please try again.';
};

export default function AuthErrorPage({
  returnTo,
  mode,
  error,
  errorCode,
  errorId,
  cleared,
}: AuthErrorPageProps) {
  const title = 'Sign-in failed';
  const subtitle = toFriendlyMessage(errorCode ?? error);
  const clearHref = buildClearAuthHref(returnTo, mode);

  return (
    <AuthPageLayout
      title={title}
      subtitle={subtitle}
      footer={
        <div className="space-y-1">
          {errorCode ? <div>Code: {errorCode}</div> : null}
          {errorId ? <div>Trace ID: {errorId}</div> : null}
        </div>
      }
    >
      {cleared ? (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          Auth state cleared. Please retry sign-in.
        </div>
      ) : null}
      <div className="flex flex-col gap-3">
        <LoginLink returnTo={returnTo} mode={mode} className="block">
          <Button
            type="button"
            className="w-full justify-center text-base font-medium"
          >
            Retry sign-in
          </Button>
        </LoginLink>
        <a href={clearHref} className="block">
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-center text-base font-medium"
          >
            Clear auth state
          </Button>
        </a>
      </div>
    </AuthPageLayout>
  );
}
