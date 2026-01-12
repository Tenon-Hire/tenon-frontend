import Link from 'next/link';
import { BRAND_NAME } from '@/lib/brand';
import { AppNav } from './AppNav';
import { contentContainer } from './layoutStyles';

type AppHeaderProps = {
  isAuthed: boolean;
  permissions?: string[];
  navScope?: 'candidate' | 'recruiter' | 'marketing' | 'auth';
};

export function AppHeader({
  isAuthed,
  permissions = [],
  navScope,
}: AppHeaderProps) {
  return (
    <header className="border-b bg-white">
      <div
        className={`${contentContainer} flex items-center justify-between py-3`}
      >
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {BRAND_NAME}
        </Link>
        <AppNav
          isAuthed={isAuthed}
          permissions={permissions}
          navScope={navScope}
        />
      </div>
    </header>
  );
}
