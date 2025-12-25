import React from 'react';
import { render } from '@testing-library/react';
import { CandidateSessionProvider } from '@/features/candidate/session/CandidateSessionProvider';

export function renderCandidateWithProviders(ui: React.ReactElement) {
  return render(<CandidateSessionProvider>{ui}</CandidateSessionProvider>);
}
