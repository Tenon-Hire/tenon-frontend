import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SimuHire',
  description: 'Simulation-based hiring that replaces interviews.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-slate-50 text-slate-900">
        <div className="flex min-h-screen flex-col">
          <header className="border-b bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white">
                  SimuHire
                </span>
                <span className="text-sm text-slate-500">
                  Simulation-based hiring for engineering teams
                </span>
              </div>
              <div className="text-xs text-slate-400">
                MVP · Backend: FastAPI · Frontend: Next.js
              </div>
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto max-w-6xl px-4 py-8">
              {children}
            </div>
          </main>

          <footer className="border-t bg-white">
            <div className="mx-auto max-w-6xl px-4 py-3 text-xs text-slate-400">
              © {new Date().getFullYear()} SimuHire. All rights reserved.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
