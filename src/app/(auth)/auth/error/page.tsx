import type { Metadata } from 'next';
import AuthErrorPage from '@/features/auth/AuthErrorPage';
import { BRAND_NAME } from '@/lib/brand';
import { modeForPath } from '@/lib/auth/routing';

export const metadata: Metadata = {
  title: `Sign-in error | ${BRAND_NAME}`,
  description: `We could not complete your ${BRAND_NAME} sign-in.`,
};

type SearchParams = Promise<{
  returnTo?: string;
  mode?: string;
  error?: string;
  errorCode?: string;
  errorId?: string;
  cleared?: string;
}>;

export default async function AuthErrorRoutePage({
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
    rawMode === 'candidate' || rawMode === 'recruiter'
      ? rawMode
      : returnTo
        ? modeForPath(returnTo.split('?')[0] || returnTo)
        : undefined;
  const error =
    resolved && typeof resolved.error === 'string' ? resolved.error : undefined;
  const errorCode =
    resolved && typeof resolved.errorCode === 'string'
      ? resolved.errorCode
      : undefined;
  const errorId =
    resolved && typeof resolved.errorId === 'string'
      ? resolved.errorId
      : undefined;
  const cleared =
    resolved && typeof resolved.cleared === 'string'
      ? resolved.cleared === '1' || resolved.cleared === 'true'
      : false;

  return (
    <AuthErrorPage
      returnTo={returnTo}
      mode={mode}
      error={error}
      errorCode={errorCode}
      errorId={errorId}
      cleared={cleared}
    />
  );
}
