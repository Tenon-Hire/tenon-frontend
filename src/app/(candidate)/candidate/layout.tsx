import type { ReactNode } from 'react';
import { CandidateSessionProvider } from '@/features/candidate/session/CandidateSessionProvider';

export default function CandidateLayout({ children }: { children: ReactNode }) {
  return <CandidateSessionProvider>{children}</CandidateSessionProvider>;
}
