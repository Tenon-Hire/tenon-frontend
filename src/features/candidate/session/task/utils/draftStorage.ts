import {
  clearCodeDraft,
  loadCodeDraft,
  saveCodeDraft,
} from '@/lib/storage/candidateDrafts';
import { BRAND_SLUG } from '@/lib/brand';

function textDraftKey(taskId: number) {
  return `${BRAND_SLUG}:candidate:textDraft:${String(taskId)}`;
}

export function loadTextDraft(taskId: number): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage.getItem(textDraftKey(taskId)) ?? '';
  } catch {
    return '';
  }
}

export function saveTextDraft(taskId: number, text: string) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(textDraftKey(taskId), text);
  } catch {}
}

export function clearTextDraft(taskId: number) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(textDraftKey(taskId));
  } catch {}
}

export function loadCodeDraftForTask(
  candidateSessionId: number,
  taskId: number,
): string | null {
  return loadCodeDraft(candidateSessionId, taskId);
}

export function saveCodeDraftForTask(
  candidateSessionId: number,
  taskId: number,
  code: string,
) {
  return saveCodeDraft(candidateSessionId, taskId, code);
}

export function clearCodeDraftForTask(
  candidateSessionId: number,
  taskId: number,
) {
  return clearCodeDraft(candidateSessionId, taskId);
}
