import { useCallback, useEffect, useRef, useState } from 'react';

type Loader<T> = (signal?: AbortSignal) => Promise<T>;

type Options<T> = {
  immediate?: boolean;
  onSuccess?: (value: T) => void;
  onError?: (error: unknown) => string | null;
};

type Controls<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  load: (force?: boolean) => Promise<T | void>;
  abort: () => void;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useAsyncLoader<T>(
  loader: Loader<T>,
  options: Options<T> = {},
): Controls<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const inflightRef = useRef<Promise<T> | null>(null);
  const seqRef = useRef(0);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const load = useCallback(
    async (force = true) => {
      if (!force && inflightRef.current) return inflightRef.current;
      abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setError(null);
      const requestId = ++seqRef.current;

      const run = (async () => {
        try {
          const value = await loader(controller.signal);
          if (controller.signal.aborted || requestId !== seqRef.current)
            return value;
          setData(value);
          optionsRef.current.onSuccess?.(value);
          return value;
        } catch (err) {
          if (controller.signal.aborted || requestId !== seqRef.current) return;
          const message =
            optionsRef.current.onError?.(err) ||
            (err instanceof Error && err.message
              ? err.message
              : 'Request failed');
          setError(message);
        } finally {
          if (requestId === seqRef.current) {
            inflightRef.current = null;
            setLoading(false);
          }
        }
      })();

      inflightRef.current = run as Promise<T>;
      return run;
    },
    [abort, loader],
  );

  useEffect(() => () => abort(), [abort]);

  useEffect(() => {
    if (options.immediate === false) return;
    const id = window.setTimeout(() => {
      void load(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, [load, options.immediate]);

  return { data, loading, error, load, abort, setData, setError };
}
