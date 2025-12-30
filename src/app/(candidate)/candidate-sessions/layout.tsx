import type { ReactNode } from 'react';
import { CandidateSessionProvider } from '@/features/candidate/session/CandidateSessionProvider';

export default function CandidateSessionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <CandidateSessionProvider>{children}</CandidateSessionProvider>;
}
