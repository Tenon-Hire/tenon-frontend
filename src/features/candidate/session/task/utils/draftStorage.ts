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
