import { ReactNode } from "react";
import Link from "next/link";
import { auth0 } from "@/lib/auth0";

type AppShellProps = {
  children: ReactNode;
};

export default async function AppShell({ children }: AppShellProps) {
  const session = await auth0.getSession();
  const isAuthed = !!session?.user;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            SimuHire
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            {isAuthed && ( <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
              Dashboard
            </Link>)  }

            {isAuthed && (
              <a href="/logout" className="text-gray-700 hover:text-gray-900">
                Logout
              </a>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
