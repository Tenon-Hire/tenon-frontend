import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
import './globals.css';
import AppShell from '@/features/shared/layout/AppShell';

export const metadata: Metadata = {
  title: 'SimuHire',
  description: 'Simulation-based hiring platform',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
