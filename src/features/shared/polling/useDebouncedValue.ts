import { useEffect, useState } from 'react';
import { useBackoffPolling } from './useBackoffPolling';

type Options<T> = {
  value: T;
  delayMs?: number;
};

export function useDebouncedValue<T>({ value, delayMs = 180 }: Options<T>) {
  const [debounced, setDebounced] = useState(value);

  const debouncer = useBackoffPolling<T>({
    initialDelayMs: delayMs,
    baseDelayMs: delayMs,
    maxDelayMs: delayMs,
    run: (next) => {
      setDebounced(next);
      return false;
    },
  });

  useEffect(() => {
    debouncer.start(value);
    return debouncer.cancel;
  }, [debouncer, value]);

  return debounced;
}
