import type { Dispatcher } from 'undici';
import { USE_FETCH_DISPATCHER } from './constants';

let AgentCtor: typeof import('undici').Agent | null = null;
let sharedDispatcher: Dispatcher | null = null;

export function getFetchDispatcher(): Dispatcher | undefined {
  if (!USE_FETCH_DISPATCHER) return undefined;
  if (
    typeof MessageChannel === 'undefined' ||
    typeof MessagePort === 'undefined' ||
    typeof ReadableStream === 'undefined'
  ) {
    return undefined;
  }

  if (!AgentCtor) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      AgentCtor = require('undici').Agent;
    } catch {
      return undefined;
    }
  }
  if (!AgentCtor) return undefined;
  if (sharedDispatcher) return sharedDispatcher;

  sharedDispatcher = new AgentCtor({
    keepAliveTimeout: 10_000,
    keepAliveMaxTimeout: 15_000,
    headersTimeout: 30_000,
    connections: 100,
  });

  return sharedDispatcher;
}
