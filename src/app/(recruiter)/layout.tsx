import type { ReactNode } from 'react';
import AppShell from '@/shared/layout/AppShell';

export default function RecruiterLayout({ children }: { children: ReactNode }) {
  return <AppShell navScope="recruiter">{children}</AppShell>;
}
