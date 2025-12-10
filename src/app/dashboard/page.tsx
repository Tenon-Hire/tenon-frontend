'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        Recruiter dashboard (M0 placeholder)
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        You&apos;re authenticated. In later milestones this will list simulations and candidates.
      </p>
    </div>
  );
}
