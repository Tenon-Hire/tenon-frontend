'use client';

import { CandidateSessionScreen } from './CandidateSessionScreen';
import { useCandidateSessionController } from './hooks/useCandidateSessionController';

export default function CandidateSessionPage({ token }: { token: string }) {
  const viewModel = useCandidateSessionController(token);
  return <CandidateSessionScreen {...viewModel} />;
}
