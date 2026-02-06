import { runWithRetries } from './loop';
import type { RobustFetchOptions } from '../robustFetch.types';

export async function robustFetch(
  options: RobustFetchOptions,
): Promise<Response> {
  const headers = new Headers(options.init.headers ?? {});
  return runWithRetries({ ...options, headers });
}
