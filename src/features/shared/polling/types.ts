export type BackoffOptions<T> = {
  run: (
    context: T,
    attempt: number,
    startedAt: number,
  ) => Promise<boolean> | boolean;
  getDelayMs?: (attempt: number) => number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  initialDelayMs?: number;
  maxAttempts?: number;
  maxDurationMs?: number;
  onTimeout?: () => void;
  onMaxAttempts?: () => void;
  onError?: (err: unknown) => void;
};

export type BackoffControls<T> = {
  start: (context: T) => void;
  startFrom: (attempt: number, context: T) => void;
  cancel: () => void;
  isActive: () => boolean;
};
