export function jitteredBackoffMs(attempt: number, base = 150, cap = 1000) {
  const exp = base * 2 ** (attempt - 1);
  const jitter = Math.random() * 100;
  return Math.min(cap, exp + jitter);
}

export function parseRetryAfterMs(
  raw: string | null,
  nowMs: number,
  capMs = 2000,
) {
  if (!raw) return null;
  const numeric = Number(raw);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return Math.min(capMs, numeric * 1000);
  }

  const dateVal = Date.parse(raw);
  if (!Number.isNaN(dateVal) && dateVal > 0) {
    const delta = dateVal - nowMs;
    if (delta > 0) return Math.min(capMs, delta);
  }

  return null;
}
