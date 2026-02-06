import { useEffect } from 'react';

export function useRunInit(
  runInit: (token: string, allowRetry?: boolean) => void,
  token: string,
) {
  useEffect(() => {
    void runInit(token);
  }, [runInit, token]);
}
