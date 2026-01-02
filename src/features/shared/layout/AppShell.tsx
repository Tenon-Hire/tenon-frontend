import { ReactNode } from 'react';
import { getSessionNormalized } from '@/lib/auth0';
import { extractPermissions } from '@/lib/auth0-claims';
import { AppHeader } from './AppHeader';
import { contentContainer } from './layoutStyles';

type AppShellProps = {
  children: ReactNode;
};

export default async function AppShell({ children }: AppShellProps) {
  const session = await getSessionNormalized();
  const isAuthed = !!session?.user;
  const permissions = extractPermissions(session?.user, null);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to main content
      </a>
      <AppHeader isAuthed={isAuthed} permissions={permissions} />
      <main id="main-content" className={`${contentContainer} py-6`}>
        {children}
      </main>
    </div>
  );
}
