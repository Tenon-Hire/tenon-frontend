'use client';

import { CandidateSessionView } from './CandidateSessionView';
import { useCandidateSessionController } from './hooks/useCandidateSessionController';

export default function CandidateSessionPage({ token }: { token: string }) {
  const viewModel = useCandidateSessionController(token);
  return <CandidateSessionView {...viewModel} />;
}
