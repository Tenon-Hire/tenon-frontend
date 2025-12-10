import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">
          Welcome to SimuHire
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-600">
          Run multi-day work simulations that replace traditional interviews for backend engineers.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/login"
          className="inline-flex items-center rounded-md border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Recruiter login
        </Link>

        <Link
          href="/candidate/demo-token"
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Candidate portal (example)
        </Link>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        In production, candidates will receive a unique simulation link like{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.7rem]">
          /candidate/&lt;invite-token&gt;
        </code>.
      </p>
    </div>
  );
}
