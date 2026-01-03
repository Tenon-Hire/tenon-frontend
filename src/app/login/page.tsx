import type { Metadata } from 'next';
import LoginPage from '@/features/auth/LoginPage';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Sign in | ${BRAND_NAME}`,
  description: `Sign in to access your ${BRAND_NAME} account.`,
};

type SearchParams = Promise<{ returnTo?: string; mode?: string }>;

export default async function LoginRoutePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const returnTo =
    resolved && typeof resolved.returnTo === 'string'
      ? resolved.returnTo
      : undefined;
  const rawMode = resolved?.mode;
  const mode =
    rawMode === 'candidate' || rawMode === 'recruiter' ? rawMode : undefined;
  return <LoginPage returnTo={returnTo} mode={mode} />;
}
