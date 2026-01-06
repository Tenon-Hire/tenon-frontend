import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CandidateSessionPage from '@/features/candidate/session/CandidateSessionPage';
import { BRAND_NAME } from '@/lib/brand';
import {
  requireCandidateToken,
  type TokenParams,
} from '../../../candidate-sessions/token-params';
import { getSessionNormalized } from '@/lib/auth0';

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

  const session = await getSessionNormalized();
  if (!session) {
    redirect(
      `/auth/login?mode=candidate&returnTo=${encodeURIComponent(`/candidate/session/${token}`)}`,
    );
  }

  return <CandidateSessionPage token={token} />;
}
