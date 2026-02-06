export function applyTimeout(timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  return {
    controller,
    timedOut: () => timedOut,
    clear: () => clearTimeout(timeoutId),
  };
}

export function attachRouteAbort(
  routeSignal: AbortSignal | undefined,
  controller: AbortController,
) {
  if (!routeSignal) return undefined;
  if (routeSignal.aborted) {
    throw routeSignal.reason ?? new DOMException('Aborted', 'AbortError');
  }
  const onAbort = () => controller.abort(routeSignal.reason);
  routeSignal.addEventListener('abort', onAbort, { once: true });
  return () => routeSignal.removeEventListener('abort', onAbort);
}

export function remainingTimeBudget(
  maxTotalTimeMs: number | undefined,
  startTime: number,
) {
  if (typeof maxTotalTimeMs !== 'number') return null;
  return maxTotalTimeMs - (Date.now() - startTime);
}
