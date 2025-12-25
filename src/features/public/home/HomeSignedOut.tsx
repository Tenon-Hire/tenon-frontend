import AuthLoginLink from '@/components/auth/AuthLoginLink';
import { ActionRow } from '../shared/ActionRow';
import { primaryCtaClass, secondaryCtaClass } from '../shared/buttons';

export function HomeSignedOut() {
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

      <ActionRow>
        <AuthLoginLink returnTo="/dashboard" className={primaryCtaClass}>
          Recruiter login
        </AuthLoginLink>

        <AuthLoginLink
          returnTo="/candidate/demo-token"
          className={secondaryCtaClass}
        >
          Candidate portal
        </AuthLoginLink>
      </ActionRow>

      <p className="mt-4 text-xs text-slate-500">
        In production, candidates will receive a unique simulation link like{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.7rem]">
          /candidate/&lt;invite-token&gt;
        </code>
        .
      </p>
    </div>
  );
}
