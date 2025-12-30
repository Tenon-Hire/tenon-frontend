import { useCallback, useRef, useState } from 'react';
import {
  resolveCandidateInviteToken,
  type CandidateSessionBootstrapResponse,
} from '@/lib/api/candidate';
import { friendlyBootstrapError } from '../utils/errorMessages';

type BootstrapState = 'idle' | 'loading' | 'ready' | 'error';

type Params = {
  token: string | null;
  onResolved: (data: CandidateSessionBootstrapResponse) => void;
  onSetToken: (token: string) => void;
};

export function useCandidateBootstrap({
  token,
  onResolved,
  onSetToken,
}: Params) {
  const [state, setState] = useState<BootstrapState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const lastTokenRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setState('error');
      setErrorMessage('Missing invite token.');
      return;
    }

    if (inFlightRef.current && lastTokenRef.current === token) return;

    inFlightRef.current = true;
    lastTokenRef.current = token;
    setState('loading');
    setErrorMessage(null);

    try {
      onSetToken(token);
      const data = await resolveCandidateInviteToken(token);
      onResolved(data);
      setState('ready');
    } catch (err) {
      setErrorMessage(friendlyBootstrapError(err));
      setState('error');
    } finally {
      inFlightRef.current = false;
    }
  }, [onResolved, onSetToken, token]);

  return { state, errorMessage, load };
}
