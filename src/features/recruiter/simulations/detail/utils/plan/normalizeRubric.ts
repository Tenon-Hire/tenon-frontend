import { toStringOrNull } from '../parsing';

export function normalizeRubric(raw: unknown): {
  rubricItems: string[];
  rubricText: string | null;
} {
  if (Array.isArray(raw)) {
    const rubricItems = raw
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const rec = item as Record<string, unknown>;
          return (
            toStringOrNull(
              rec.title ?? rec.text ?? rec.summary ?? rec.description,
            ) ?? null
          );
        }
        return null;
      })
      .filter((item): item is string => Boolean(item));
    return rubricItems.length
      ? { rubricItems, rubricText: null }
      : { rubricItems: [], rubricText: null };
  }
  if (typeof raw === 'string') {
    const text = raw.trim();
    return { rubricItems: [], rubricText: text || null };
  }
  if (raw && typeof raw === 'object') {
    const rec = raw as Record<string, unknown>;
    const text =
      toStringOrNull(
        rec.text ??
          rec.summary ??
          rec.description ??
          rec.criteria ??
          rec.details,
      ) ?? null;
    return { rubricItems: [], rubricText: text };
  }
  return { rubricItems: [], rubricText: null };
}
