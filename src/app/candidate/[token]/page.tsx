import { notFound } from 'next/navigation';

interface CandidatePageProps {
  params: { token: string };
}

export default function CandidatePage({ params }: CandidatePageProps) {
  const { token } = params;

  if (!token) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        Candidate simulation portal (M0 placeholder)
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Token: <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{token}</code>
      </p>
      <p className="mt-4 text-sm text-slate-600">
        In later milestones, this route will load the 5-day simulation (tasks, Monaco editor, test runner)
        for the candidate associated with this invite token.
      </p>
    </div>
  );
}
