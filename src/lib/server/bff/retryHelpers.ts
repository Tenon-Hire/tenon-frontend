const RETRY_STATUSES = new Set([429, 502, 503, 504]);

export const shouldRetryStatus = (status: number) => RETRY_STATUSES.has(status);

export async function drainUpstream(upstream: Response) {
  if (typeof upstream.body?.cancel === 'function') {
    await upstream.body.cancel().catch(() => undefined);
    return;
  }
  await upstream.arrayBuffer().catch(() => undefined);
}

export function attachMeta(
  upstream: Response,
  attempts: number,
  startTime: number,
) {
  (upstream as unknown as { _tenonMeta?: unknown })._tenonMeta = {
    attempts,
    durationMs: Date.now() - startTime,
  };
}
