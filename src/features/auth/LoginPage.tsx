import Button from '@/components/ui/Button';
import LoginLink from '@/features/auth/LoginLink';
import { AuthPageLayout } from './AuthPageLayout';

export default function LoginPage() {
  return (
    <AuthPageLayout
      title="Recruiter login"
      subtitle="Sign in to access your SimuHire dashboard."
    >
      <p className="mb-4 text-sm text-gray-600">
        You will be redirected to Auth0 to sign in securely.
      </p>

      <LoginLink returnTo="/dashboard" className="block">
        <Button
          type="button"
          className="w-full justify-center text-base font-medium"
        >
          Continue with Auth0
        </Button>
      </LoginLink>
    </AuthPageLayout>
  );
}
