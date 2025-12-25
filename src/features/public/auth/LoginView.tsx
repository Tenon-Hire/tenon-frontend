import Button from '@/components/common/Button';
import AuthLoginLink from '@/components/auth/AuthLoginLink';
import { AuthPageLayout } from '../shared/AuthPageLayout';

export default function LoginView() {
  return (
    <AuthPageLayout
      title="Recruiter login"
      subtitle="Sign in to access your SimuHire dashboard."
    >
      <p className="mb-4 text-sm text-gray-600">
        You will be redirected to Auth0 to sign in securely.
      </p>

      <AuthLoginLink returnTo="/dashboard" className="block">
        <Button
          type="button"
          className="w-full justify-center text-base font-medium"
        >
          Continue with Auth0
        </Button>
      </AuthLoginLink>
    </AuthPageLayout>
  );
}
