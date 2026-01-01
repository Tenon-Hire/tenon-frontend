import type { Metadata } from 'next';
import CandidateSessionPage from '@/features/candidate/session/CandidateSessionPage';
import {
  requireCandidateToken,
  type TokenParams,
} from '../../../candidate-sessions/token-params';

export const metadata: Metadata = {
  title: 'Candidate simulation | SimuHire',
  description: 'Work through your SimuHire day-by-day simulation.',
};

export default async function CandidateSessionRoute({
  params,
}: {
  params: TokenParams;
}) {
  const token = await requireCandidateToken(params);

  return <CandidateSessionPage token={token} />;
}
