import { toUserMessage } from '@/lib/utils/errors';

export function formatCreatedDate(iso: string): string {
  if (typeof iso !== 'string') return '';
  const trimmed = iso.trim();
  if (!trimmed) return '';
  const [datePart] = trimmed.split('T');
  return datePart;
}

export function errorToMessage(e: unknown, fallback: string): string {
  if (typeof e === 'string' && e.trim()) return e.trim();
  return toUserMessage(e, fallback, { includeDetail: true });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;

  let clipboardFailed = false;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(trimmed);
      return true;
    } catch {
      clipboardFailed = true;
    }
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = trimmed;
    ta.setAttribute('readonly', 'true');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return clipboardFailed ? false : ok;
  } catch {
    return false;
  }
}
