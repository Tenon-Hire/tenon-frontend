import type { Metadata } from 'next';
import CandidateSessionPageClient from '@/features/candidate/session/CandidateSessionPageClient';
import { extractToken, type TokenParams } from '../token';

export const metadata: Metadata = {
  title: 'Candidate simulation | SimuHire',
  description: 'Work through your SimuHire day-by-day simulation.',
};

export default async function CandidatePage({
  params,
}: {
  params: TokenParams;
}) {
  const token = await extractToken(params);

  return <CandidateSessionPageClient token={token} />;
}
