import Link from 'next/link';
import type { Metadata } from 'next';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Not authorized | ${BRAND_NAME}`,
  description: 'You do not have access to this area.',
};

type SearchParams = Promise<{ mode?: string; returnTo?: string }>;

export default async function NotAuthorizedPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const rawMode = resolved?.mode;
  const mode =
    rawMode === 'candidate' || rawMode === 'recruiter' ? rawMode : undefined;
  const returnTo = resolved?.returnTo;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Not authorized</h1>
        <p className="mt-2 text-sm text-gray-700">
          {mode === 'candidate'
            ? 'You need candidate access to view this page.'
            : mode === 'recruiter'
              ? 'You need recruiter access to view this page.'
              : 'You are signed in, but you do not have permission to view this page.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={
            returnTo && mode === 'candidate' ? returnTo : '/candidate/dashboard'
          }
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
        >
          Go to Candidate Portal
        </Link>
        <Link
          href={returnTo && mode === 'recruiter' ? returnTo : '/dashboard'}
          className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          Go to Recruiter Dashboard
        </Link>
      </div>
    </div>
  );
}
