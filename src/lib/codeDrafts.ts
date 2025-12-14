export function codeDraftKey(candidateSessionId: string, taskId: string) {
  return `simuhire:candidate:codeDraft:${candidateSessionId}:${taskId}`;
}

export function loadCodeDraft(candidateSessionId: string, taskId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(codeDraftKey(candidateSessionId, taskId));
}

export function saveCodeDraft(candidateSessionId: string, taskId: string, code: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(codeDraftKey(candidateSessionId, taskId), code);
}

export function clearCodeDraft(candidateSessionId: string, taskId: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(codeDraftKey(candidateSessionId, taskId));
}
