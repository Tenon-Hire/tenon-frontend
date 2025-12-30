import { redirect } from 'next/navigation';
import { extractToken, type TokenParams } from '../../token';

export default async function CandidateSessionRedirectPage({
  params,
}: {
  params: TokenParams;
}) {
  const token = await extractToken(params);
  redirect(`/candidate/${token}`);
}
