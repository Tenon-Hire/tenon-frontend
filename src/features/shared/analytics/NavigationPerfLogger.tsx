'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const DEBUG_PERF =
  process.env.NEXT_PUBLIC_TENON_DEBUG_PERF === '1' ||
  process.env.NEXT_PUBLIC_TENON_DEBUG_PERF === 'true';

export function NavigationPerfLogger() {
  const pathname = usePathname();

  useEffect(() => {
    if (!DEBUG_PERF || typeof performance === 'undefined') return;
    const navEntries = performance.getEntriesByType(
      'navigation',
    ) as PerformanceNavigationTiming[];
    const duration =
      navEntries?.[0]?.duration && Number.isFinite(navEntries[0].duration)
        ? Math.round(navEntries[0].duration)
        : Math.round(performance.now());

    // eslint-disable-next-line no-console
    console.log(`[perf:navigation] ${pathname} duration=${duration}ms`);
  }, [pathname]);

  return null;
}
