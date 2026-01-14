import Button from '@/components/ui/Button';
import LoginLink from '@/features/auth/LoginLink';
import { BRAND_NAME } from '@/lib/brand';
import { AuthPageLayout } from './AuthPageLayout';
import { buildSignupHref, type LoginMode } from './authPaths';

export default function LoginPage({
  returnTo,
  mode,
}: {
  returnTo?: string;
  mode?: LoginMode;
}) {
  const isCandidate =
    mode === 'candidate' ||
    (returnTo ?? '').startsWith('/candidate/session') ||
    (returnTo ?? '').startsWith('/candidate-sessions') ||
    (returnTo ?? '').startsWith('/candidate/');
  const title = isCandidate
    ? 'Sign in to continue your simulation'
    : 'Recruiter login';
  const subtitle = isCandidate
    ? 'Sign in to verify your invite and continue.'
    : `Sign in to access your ${BRAND_NAME} dashboard.`;
  const missingCandidateConnection =
    process.env.NODE_ENV !== 'production' &&
    isCandidate &&
    !(process.env.NEXT_PUBLIC_TENON_AUTH0_CANDIDATE_CONNECTION ?? '').trim();

  const signupHref = isCandidate
    ? buildSignupHref(returnTo || '/candidate/dashboard', 'candidate')
    : null;

  return (
    <AuthPageLayout title={title} subtitle={subtitle}>
      {missingCandidateConnection ? (
        <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
          Dev warning: set NEXT_PUBLIC_TENON_AUTH0_CANDIDATE_CONNECTION so
          candidate logins use the correct Auth0 connection.
        </div>
      ) : null}
      <p className="mb-4 text-sm text-gray-600">
        You will be redirected to Auth0 to sign in securely.
      </p>

      <LoginLink
        returnTo={returnTo || '/dashboard'}
        mode={mode ?? (isCandidate ? 'candidate' : 'recruiter')}
        className="block"
      >
        <Button
          type="button"
          className="w-full justify-center text-base font-medium"
        >
          Continue with Auth0
        </Button>
      </LoginLink>

      {signupHref ? (
        <a
          href={signupHref}
          className="mt-3 block text-center text-sm text-blue-600 hover:underline"
        >
          New candidate? Create your account
        </a>
      ) : null}
    </AuthPageLayout>
  );
}
