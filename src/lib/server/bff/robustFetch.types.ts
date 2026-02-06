export type RobustFetchOptions = {
  url: string;
  init: RequestInit;
  requestId: string;
  timeoutMs?: number;
  maxAttempts?: number;
  backoffBaseMs?: number;
  backoffCapMs?: number;
  maxTotalTimeMs?: number;
};
