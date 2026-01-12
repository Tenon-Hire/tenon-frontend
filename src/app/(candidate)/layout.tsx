import type { ReactNode } from 'react';
import AppShell from '@/features/shared/layout/AppShell';

export default function CandidateLayout({ children }: { children: ReactNode }) {
  return <AppShell navScope="candidate">{children}</AppShell>;
}
