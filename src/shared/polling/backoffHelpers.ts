export const buildDelay =
  (baseMs?: number, capMs?: number) => (attempt: number) => {
    const base = Math.max(1, baseMs ?? 1500);
    const cap = Math.max(capMs ?? 5000, base);
    return Math.min(Math.round(base * 1.4 ** attempt), cap);
  };

export const isPromiseLike = (value: unknown): value is Promise<unknown> =>
  Boolean(value && typeof (value as Promise<unknown>).then === 'function');
