export function toStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function toStringOrCsv(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value)) {
    const parts = value
      .map(toStringOrNull)
      .filter((v): v is string => Boolean(v));
    return parts.length ? parts.join(', ') : null;
  }
  return null;
}

export function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function toBooleanOrNull(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }
  return null;
}

export function parseDayIndex(value: unknown, fallback: number | null): number {
  const parsed = toNumberOrNull(value);
  if (parsed && parsed >= 1 && parsed <= 10) return parsed;
  if (typeof value === 'string') {
    const match = value.match(/(\d+)/);
    if (match) {
      const num = Number(match[1]);
      if (Number.isFinite(num)) return num;
    }
  }
  return fallback ?? 0;
}
