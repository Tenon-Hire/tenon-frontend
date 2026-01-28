'use client';

import { useReportWebVitals, type Metric } from 'next/web-vitals';

const debugPerf = ['1', 'true'].includes(
  (process.env.NEXT_PUBLIC_TENON_DEBUG_PERF ?? '').toLowerCase(),
);

const watchedMetrics = new Set<Metric['name']>(['LCP', 'INP', 'CLS']);

function formatValue(metric: Metric) {
  if (metric.name === 'CLS') {
    return Number(metric.value.toFixed(4));
  }
  return Math.round(metric.value);
}

export function WebVitalsLogger() {
  useReportWebVitals((metric) => {
    if (!debugPerf) return;
    if (!watchedMetrics.has(metric.name)) return;

    const payload: Record<string, unknown> = {
      id: metric.id,
      name: metric.name,
      rating: metric.rating,
      value: formatValue(metric),
    };

    // eslint-disable-next-line no-console
    console.info('[perf:web-vitals]', payload);
  });

  return null;
}
