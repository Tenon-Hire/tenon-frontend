import Link from 'next/link';
import { ActionRow } from '../shared/ActionRow';
import { primaryCtaClass, secondaryCtaClass } from '../shared/buttons';

export function HomeSignedIn({ name }: { name?: string | null }) {
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

        <Link href="/candidate/demo-token" className={secondaryCtaClass}>
          Open candidate simulation (demo)
        </Link>

        <Link href="/logout" className={secondaryCtaClass}>
          Logout
        </Link>
      </ActionRow>
    </div>
  );
}
