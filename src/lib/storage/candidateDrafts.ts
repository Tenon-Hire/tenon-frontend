export function codeDraftKey(
  candidateSessionId: number | string,
  taskId: number | string,
) {
  return `simuhire:candidate:codeDraft:${String(candidateSessionId)}:${String(taskId)}`;
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
