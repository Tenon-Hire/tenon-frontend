import { notFound, redirect } from 'next/navigation';

export default async function CandidateSessionRedirectPage({
  params,
}: {
  params: Promise<{ token?: string }>;
}) {
  const { token } = await params;

  if (!token) notFound();

  redirect(`/candidate/${token}`);
}
