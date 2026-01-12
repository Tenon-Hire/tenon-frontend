import type { ReactNode } from 'react';
import AppShell from '@/features/shared/layout/AppShell';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AppShell navScope="auth">{children}</AppShell>;
}
