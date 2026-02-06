import { useCallback, useRef, useState } from 'react';
import { resolveCandidateInviteToken } from '@/features/candidate/api';
import { friendlyBootstrapError } from '../utils/errorMessages';

export type BootstrapState = 'idle' | 'loading' | 'ready' | 'error';

export function useCandidateBootstrap(params: {
  inviteToken?: string | null;
  token?: string | null;
  authToken?: string | null;
  onResolved?: (data: unknown) => void;
  onSetInviteToken?: (token: string) => void;
}) {
  const [state, setState] = useState<BootstrapState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const inflightRef = useRef<{
    token: string | null;
    promise: Promise<void> | null;
  }>({ token: null, promise: null });

  const load = useCallback(async () => {
    const inviteToken = params.inviteToken ?? params.token ?? null;
    const authToken = params.authToken ?? null;
    if (!authToken) return;
    if (!inviteToken) {
      setState('error');
      setErrorMessage('Missing invite token.');
      setErrorStatus(null);
      return;
    }

    if (
      inflightRef.current.promise &&
      inflightRef.current.token === inviteToken
    ) {
      return inflightRef.current.promise;
    }

    setState('loading');
    setErrorMessage(null);
    setErrorStatus(null);

    const exec = (async () => {
      try {
        const data = await resolveCandidateInviteToken(inviteToken, authToken);
        params.onSetInviteToken?.(inviteToken);
        params.onResolved?.(data);
        setState('ready');
      } catch (err) {
        const message = friendlyBootstrapError(err);
        const status = (err as { status?: unknown })?.status;
        setErrorMessage(message);
        setErrorStatus(typeof status === 'number' ? status : null);
        setState('error');
      } finally {
        inflightRef.current = { token: null, promise: null };
      }
    })();

    inflightRef.current = { token: inviteToken, promise: exec };
    return exec;
  }, [params]);

  return { state, errorMessage, errorStatus, load };
}
