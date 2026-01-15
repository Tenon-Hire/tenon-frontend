import Link from 'next/link';
import { buildLogoutHref } from '@/features/auth/authPaths';
import { ActionRow } from '../shared/ActionRow';
import { primaryCtaClass, secondaryCtaClass } from '../shared/ctaClasses';

export function MarketingHomeSignedIn({ name }: { name?: string | null }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">
          Welcome back{typeof name === 'string' && name ? `, ${name}` : ''}.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-600">
          You’re signed in. Jump into the dashboard or continue a simulation.
        </p>
      </div>

      <ActionRow>
        <Link href="/dashboard" className={primaryCtaClass}>
          Go to dashboard
        </Link>

        <Link href="/candidate/dashboard" className={secondaryCtaClass}>
          Candidate portal
        </Link>

        <a href={buildLogoutHref()} className={secondaryCtaClass}>
          Logout
        </a>
      </ActionRow>
    </div>
  );
}
