'use client';

import { useCallback } from 'react';
import type { NextWebVitalsMetric } from 'next/app';
import { useReportWebVitals } from 'next/web-vitals';

const debugPerf = ['1', 'true'].includes(
  (process.env.NEXT_PUBLIC_TENON_DEBUG_PERF ?? '').toLowerCase(),
);

const watchedMetrics = new Set<NextWebVitalsMetric['name']>(['LCP', 'INP', 'CLS']);

function formatValue(metric: NextWebVitalsMetric) {
  if (metric.name === 'CLS') {
    return Number(metric.value.toFixed(4));
  }
  return Math.round(metric.value);
}

export function WebVitalsLogger() {
  const handleMetric = useCallback((metric: NextWebVitalsMetric) => {
    if (!debugPerf) return;
    if (!watchedMetrics.has(metric.name)) return;

    const payload: Record<string, unknown> = {
      id: metric.id,
      name: metric.name,
      value: formatValue(metric),
    };

    // eslint-disable-next-line no-console
    console.info('[perf:web-vitals]', payload);
  }, []);

  useReportWebVitals(handleMetric);

  return null;
}
