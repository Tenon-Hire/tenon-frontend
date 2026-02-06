const safeSession = () => {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
};

export const loadStoredRunId = (storageKey?: string): string | null => {
  if (!storageKey) return null;
  const storage = safeSession();
  if (!storage) return null;
  const value = storage.getItem(storageKey);
  return typeof value === 'string' && value.trim() ? value : null;
};

export const persistRunId = (
  storageKey: string | undefined,
  runId: string,
): void => {
  if (!storageKey || !runId) return;
  const storage = safeSession();
  if (!storage) return;
  try {
    storage.setItem(storageKey, runId);
  } catch {}
};
