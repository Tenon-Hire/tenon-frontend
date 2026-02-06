import {
  buildLoginUrl,
  buildNotAuthorizedUrl,
  buildReturnTo,
} from '@/lib/auth/routing';

type RedirectFn = (() => void) | undefined;

const isJsdom =
  typeof navigator !== 'undefined' &&
  typeof navigator.userAgent === 'string' &&
  navigator.userAgent.toLowerCase().includes('jsdom');

export const authRedirect = (
  status: number | null,
  mode: 'recruiter' | 'candidate',
): RedirectFn => {
  if (typeof window === 'undefined' || isJsdom) return undefined;
  if (status !== 401 && status !== 403) return undefined;

  const returnTo = buildReturnTo();
  const destination =
    status === 401
      ? buildLoginUrl(mode, returnTo)
      : buildNotAuthorizedUrl(mode, returnTo);

  return () => {
    try {
      window.location.assign(destination);
    } catch {
      return;
    }
  };
};
