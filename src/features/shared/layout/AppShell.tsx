import { ReactNode } from 'react';
import { auth0 } from '@/lib/auth0';
import { AppHeader } from './AppHeader';

type AppShellProps = {
  children: ReactNode;
};

export default async function AppShell({ children }: AppShellProps) {
  const session = await auth0.getSession();
  const isAuthed = !!session?.user;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <AppHeader isAuthed={isAuthed} />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
