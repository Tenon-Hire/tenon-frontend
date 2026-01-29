import { useEffect, useState } from 'react';
import type { RecruiterProfile } from '@/types/recruiter';
import { toUserMessage } from '@/lib/utils/errors';
import {
  buildLoginUrl,
  buildNotAuthorizedUrl,
  buildReturnTo,
} from '@/lib/auth/routing';
import { recruiterBffClient } from '@/lib/api/httpClient';

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
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const profileResp = await recruiterBffClient.get<RecruiterProfile>(
          '/auth/me',
          {
            cache: 'no-store',
            signal: controller.signal,
            cacheTtlMs: 8000,
          },
        );

        if (!cancelled) {
          setProfile(profileResp);
          setError(null);
        }
      } catch (err: unknown) {
        const status =
          err && typeof err === 'object'
            ? (err as { status?: unknown }).status
            : null;
        if (
          typeof window !== 'undefined' &&
          (status === 401 || status === 403)
        ) {
          const returnTo = buildReturnTo();
          const mode = 'recruiter';
          const destination =
            status === 401
              ? buildLoginUrl(mode, returnTo)
              : buildNotAuthorizedUrl(mode, returnTo);
          window.location.assign(destination);
          return;
        }
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
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { profile, error, loading };
}
