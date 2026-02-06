import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Params = {
  authStatus: string;
  token: string;
  loginHref: string;
};

export function useAuthRedirect({ authStatus, token, loginHref }: Params) {
  const router = useRouter();
  useEffect(() => {
    if (authStatus !== 'unauthenticated') return;
    const returnTo = `/candidate/session/${encodeURIComponent(token)}`;
    router.replace(loginHref ?? returnTo);
  }, [authStatus, loginHref, router, token]);
}
