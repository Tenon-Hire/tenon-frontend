export const toSafeErrorCode = (error: { code?: unknown; name?: unknown }) => {
  const raw =
    (typeof error.code === 'string' && error.code) ||
    (typeof error.name === 'string' && error.name) ||
    'auth_callback_error';
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
};

export const toSafeErrorMessage = (error: unknown) => {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : null;
  if (!raw) return null;
  const trimmed = raw
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[?&#].*/g, '')
    .replace(/[^a-zA-Z0-9 .,:;_()-]/g, '')
    .trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 160);
};

export const createAuthErrorId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    const maybe = (crypto as { randomUUID?: () => string }).randomUUID;
    if (typeof maybe === 'function') return maybe();
  }
  return `auth-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;
};
