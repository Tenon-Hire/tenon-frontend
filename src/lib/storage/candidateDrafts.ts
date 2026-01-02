import { BRAND_SLUG } from '@/lib/brand';

const DRAFT_PREFIX = `${BRAND_SLUG}:candidate:codeDraft`;

export function codeDraftKey(
  candidateSessionId: number | string,
  taskId: number | string,
) {
  return `${DRAFT_PREFIX}:${String(candidateSessionId)}:${String(taskId)}`;
}

export function loadCodeDraft(
  candidateSessionId: number | string,
  taskId: number | string,
): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(
      codeDraftKey(candidateSessionId, taskId),
    );
  } catch {
    return null;
  }
}

export function saveCodeDraft(
  candidateSessionId: number | string,
  taskId: number | string,
  code: string,
) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      codeDraftKey(candidateSessionId, taskId),
      code,
    );
  } catch {}
}

export function clearCodeDraft(
  candidateSessionId: number | string,
  taskId: number | string,
) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(codeDraftKey(candidateSessionId, taskId));
  } catch {}
}

export function hasCodeDraft(
  candidateSessionId: number | string,
  taskId: number | string,
): boolean {
  return loadCodeDraft(candidateSessionId, taskId) !== null;
}

export function clearAllCodeDrafts() {
  if (typeof window === 'undefined') return;
  try {
    const keysToDelete: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith(DRAFT_PREFIX)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {}
}
