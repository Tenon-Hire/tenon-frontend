import { useCallback, useRef } from 'react';

const debugSession = ['1', 'true'].includes(
  (process.env.NEXT_PUBLIC_TENON_DEBUG_PERF ?? '').toLowerCase(),
);

export function usePerfMarks() {
  const marks = useRef<Record<string, number>>({});

  const markStart = useCallback((label: string) => {
    if (!debugSession || typeof performance === 'undefined') return;
    marks.current[label] = performance.now();
    try {
      performance.mark(`${label}:start`);
    } catch {}
  }, []);

  const markEnd = useCallback(
    (label: string, extra?: Record<string, unknown>) => {
      if (!debugSession || typeof performance === 'undefined') return;
      const start = marks.current[label];
      const now = performance.now();
      const payload =
        typeof start === 'number'
          ? { durationMs: Math.round(now - start), ...(extra ?? {}) }
          : extra;
      try {
        performance.mark(`${label}:end`);
        performance.measure(
          `${label}:duration`,
          `${label}:start`,
          `${label}:end`,
        );
      } catch {}
      if (typeof start === 'number') {
        // eslint-disable-next-line no-console
        console.info(`[perf:ui] ${label}`, payload);
      }
    },
    [],
  );

  return { markStart, markEnd };
}
