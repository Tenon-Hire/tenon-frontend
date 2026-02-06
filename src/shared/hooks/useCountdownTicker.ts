import { useEffect, useState } from 'react';
import { useBackoffPolling } from '@/shared/polling';

type Predicate = () => boolean;
export function useCountdownTicker(isActive: Predicate, intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  const ticker = useBackoffPolling<void>({
    run: () => {
      setNow(Date.now());
      return true;
    },
    getDelayMs: () => Math.max(250, intervalMs),
  });

  useEffect(() => {
    if (isActive()) ticker.start(undefined);
    else ticker.cancel();
  }, [isActive, ticker]);

  useEffect(() => () => ticker.cancel(), [ticker]);

  return now;
}
