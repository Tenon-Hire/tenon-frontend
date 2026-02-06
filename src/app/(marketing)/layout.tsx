import type { ReactNode } from 'react';
import AppShell from '@/shared/layout/AppShell';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <AppShell navScope="marketing">{children}</AppShell>;
}
