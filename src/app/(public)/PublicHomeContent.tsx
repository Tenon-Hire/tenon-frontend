import Link from "next/link";
import AuthLoginLink from "@/components/auth/AuthLoginLink";

type PublicHomeContentProps = {
  user?: { name?: string | null } | null;
};

export default function PublicHomeContent({ user }: PublicHomeContentProps) {
  if (user) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Welcome back{user.name ? `, ${user.name}` : ""}.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            You’re signed in. Jump into the dashboard or continue a simulation.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-md border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Go to dashboard
          </Link>

          <Link
            href="/candidate/demo-token"
            className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Open candidate simulation (demo)
          </Link>

          <Link
            href="/logout"
            className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Logout
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">
          Welcome to SimuHire
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-600">
          Run multi-day work simulations that replace traditional interviews for
          backend engineers.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <AuthLoginLink
          returnTo="/dashboard"
          className="inline-flex items-center rounded-md border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Recruiter login
        </AuthLoginLink>

        <AuthLoginLink
          returnTo="/candidate/demo-token"
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Candidate portal
        </AuthLoginLink>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        In production, candidates will receive a unique simulation link like{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.7rem]">
          /candidate/&lt;invite-token&gt;
        </code>
        .
      </p>
    </div>
  );
}
