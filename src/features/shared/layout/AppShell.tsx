import { ReactNode } from 'react';
import { auth0 } from '@/lib/auth0';
import { AppHeader } from './AppHeader';
import { contentContainer } from './layoutClasses';

type AppShellProps = {
  children: ReactNode;
};

export default async function AppShell({ children }: AppShellProps) {
  const session = await auth0.getSession();
  const isAuthed = !!session?.user;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to main content
      </a>
      <AppHeader isAuthed={isAuthed} />
      <main id="main-content" className={`${contentContainer} py-6`}>
        {children}
      </main>
    </div>
  );
}
