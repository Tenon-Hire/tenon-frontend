export function extractInviteToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const canonicalMatch = trimmed.match(/candidate\/session\/([^/?#\s]+)/i);
  if (canonicalMatch?.[1]) return canonicalMatch[1];

  const legacyMatch = trimmed.match(/candidate-sessions\/([^/?#\s]+)/i);
  if (legacyMatch?.[1]) return legacyMatch[1];

  const parts = trimmed.split('/');
  const last = parts.pop()?.trim() ?? '';
  return last.split(/[?#]/)[0];
}
