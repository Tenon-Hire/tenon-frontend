import Link from 'next/link';
import Button from '@/components/ui/Button';
import LogoutLink from '@/features/auth/LogoutLink';
import { BRAND_NAME } from '@/lib/brand';
import { AuthPageLayout } from './AuthPageLayout';

export default function LogoutPage() {
  return (
    <AuthPageLayout
      title="Log out"
      subtitle={`Are you sure you want to log out of ${BRAND_NAME}?`}
      footer={`This will end your ${BRAND_NAME} session and redirect you back to the app.`}
    >
      <div className="flex flex-col gap-3">
        <LogoutLink className="block">
          <Button
            type="button"
            className="w-full justify-center text-base font-medium"
          >
            Yes, log me out
          </Button>
        </LogoutLink>

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
