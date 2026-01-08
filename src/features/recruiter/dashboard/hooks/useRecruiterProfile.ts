import { useEffect, useState } from 'react';
import type { RecruiterProfile } from '@/types/recruiter';
import { toUserMessage } from '@/lib/utils/errors';
import {
  buildLoginUrl,
  buildNotAuthorizedUrl,
  buildReturnTo,
} from '@/lib/auth/routing';

type Options = {
  initialProfile?: RecruiterProfile | null;
  initialError?: string | null;
  fetchOnMount?: boolean;
};

type State = {
  profile: RecruiterProfile | null;
  error: string | null;
  loading: boolean;
};

export function useRecruiterProfile(options?: Options): State {
  const [profile, setProfile] = useState<RecruiterProfile | null>(
    options?.initialProfile ?? null,
  );
  const [error, setError] = useState<string | null>(
    options?.initialError ?? null,
  );
  const [loading, setLoading] = useState<boolean>(
    options?.fetchOnMount !== false,
  );

  useEffect(() => {
    if (options?.fetchOnMount === false) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const parsed: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          if (
            typeof window !== 'undefined' &&
            (res.status === 401 || res.status === 403)
          ) {
            const returnTo = buildReturnTo();
            const mode = 'recruiter';
            const destination =
              res.status === 401
                ? buildLoginUrl(mode, returnTo)
                : buildNotAuthorizedUrl(mode, returnTo);
            window.location.assign(destination);
            return;
          }
          const message = toUserMessage(
            parsed,
            'Unable to load your profile right now.',
            { includeDetail: true },
          );
          if (!cancelled) setError(message);
          return;
        }

        if (!cancelled) {
          setProfile(parsed as RecruiterProfile);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            toUserMessage(err, 'Unable to load your profile right now.'),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { profile, error, loading };
}
