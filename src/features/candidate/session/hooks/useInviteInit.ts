import { useRef } from 'react';
import {
  createInviteInit,
  inviteErrorCopy,
  type InviteInitParams,
} from './inviteInitRunner';

type Params = InviteInitParams & { token: string };

export function useInviteInit(params: Params) {
  const initRef = useRef({
    token: null as string | null,
    inFlight: false,
    done: false,
  });
  const runInitCore = createInviteInit(params);

  const runInit = async (
    initToken: string,
    allowRetry = false,
    authOverride?: string | null,
  ) => {
    if (
      !allowRetry &&
      initRef.current.inFlight &&
      initRef.current.token === initToken
    )
      return;
    if (
      !allowRetry &&
      initRef.current.done &&
      initRef.current.token === initToken
    )
      return;
    initRef.current = { token: initToken, inFlight: true, done: false };
    try {
      const result = await runInitCore(initToken, allowRetry, authOverride);
      if (result !== 'skip') initRef.current.done = true;
    } finally {
      initRef.current.inFlight = false;
    }
  };

  return { runInit, inviteErrorCopy };
}
