import Link from 'next/link';
import Button from '@/components/common/Button';
import AuthLogoutLink from '@/components/auth/AuthLogoutLink';
import { AuthPageLayout } from '../shared/AuthPageLayout';

export default function LogoutView() {
  return (
    <AuthPageLayout
      title="Log out"
      subtitle="Are you sure you want to log out of SimuHire?"
      footer="This will end your SimuHire session and redirect you back to the app."
    >
      <div className="flex flex-col gap-3">
        <AuthLogoutLink className="block">
          <Button
            type="button"
            className="w-full justify-center text-base font-medium"
          >
            Yes, log me out
          </Button>
        </AuthLogoutLink>

        <Link href="/dashboard" className="block">
          <Button
            type="button"
            className="w-full justify-center border border-gray-300 bg-white text-base font-medium text-gray-800 hover:bg-gray-50"
          >
            Cancel
          </Button>
        </Link>
      </div>
    </AuthPageLayout>
  );
}
