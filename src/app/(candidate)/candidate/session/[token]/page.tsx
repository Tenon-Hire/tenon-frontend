import type { Metadata } from 'next';
import CandidateSessionPage from '@/features/candidate/session/CandidateSessionPage';
import { BRAND_NAME } from '@/lib/brand';
import {
  requireCandidateToken,
  type TokenParams,
} from '../../../candidate-sessions/token-params';

export const metadata: Metadata = {
  title: `Candidate simulation | ${BRAND_NAME}`,
  description: `Work through your ${BRAND_NAME} day-by-day simulation.`,
};

export default async function CandidateSessionRoute({
  params,
}: {
  params: TokenParams;
}) {
  const token = await requireCandidateToken(params);

  return <CandidateSessionPage token={token} />;
}
