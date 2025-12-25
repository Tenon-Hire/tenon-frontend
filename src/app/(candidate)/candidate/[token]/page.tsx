import { notFound } from 'next/navigation';
import CandidateSessionPageClient from '@/features/candidate/session/CandidateSessionPageClient';

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ token?: string }>;
}) {
  const { token } = await params;

  if (!token) notFound();

  return <CandidateSessionPageClient token={token} />;
}
