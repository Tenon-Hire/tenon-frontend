const URL_REGEX = /https?:\/\/[^\s)]+/i;

export function extractFirstUrl(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const match = value.match(URL_REGEX);
  if (!match?.[0]) return null;
  return match[0].replace(/[),.]+$/, '');
}
