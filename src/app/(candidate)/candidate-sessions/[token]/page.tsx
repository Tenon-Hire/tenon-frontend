import { redirect } from 'next/navigation';
import { requireCandidateToken, type TokenParams } from '../token-params';

export default async function LegacyCandidateSessionRoute({
  params,
}: {
  params: TokenParams;
}) {
  const token = await requireCandidateToken(params);

  return redirect(`/candidate/session/${encodeURIComponent(token)}`);
}
