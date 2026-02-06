import { useEffect, useRef, useState } from 'react';
import { useBackoffPolling } from '@/shared/polling';
import { isSubmitResponse } from '../utils/taskGuards';

type SubmitStatus = 'idle' | 'submitting' | 'submitted';
type SubmitPayload = { contentText?: string };

export function useSubmitHandler(
  onSubmit: (payload: SubmitPayload) => Promise<unknown> | unknown,
) {
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [lastProgress, setLastProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  const resetTimer = useBackoffPolling<void>({
    initialDelayMs: 900,
    getDelayMs: () => 900,
    run: () => {
      setSubmitStatus('idle');
      setLastProgress(null);
      return false;
    },
  });
  const inFlightRef = useRef(false);

  useEffect(() => {
    return () => resetTimer.cancel();
  }, [resetTimer]);

  const handleSubmit = async (payload: SubmitPayload) => {
    if (submitStatus !== 'idle' || inFlightRef.current)
      return { status: 'busy' };

    inFlightRef.current = true;
    setSubmitStatus('submitting');
    try {
      const resp = await onSubmit(payload);
      if (isSubmitResponse(resp)) {
        setLastProgress(resp.progress);
        setSubmitStatus('submitted');
        resetTimer.start(undefined);
      } else {
        setSubmitStatus('idle');
      }
      return resp;
    } catch {
      setSubmitStatus('idle');
      return 'submit-failed';
    } finally {
      inFlightRef.current = false;
    }
  };

  return { submitStatus, lastProgress, handleSubmit };
}
