import { REQUEST_ID_HEADER } from '@/lib/server/bff';
import { HOP_BY_HOP_HEADERS } from './constants';

export function forwardHeaders(req: Request) {
  const headers: Record<string, string> = {};
  (req.headers as Headers).forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) headers[key] = value;
  });
  return headers;
}

export function copyUpstreamHeaders(upstream: Response, requestId: string) {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (!HOP_BY_HOP_HEADERS.has(lower) && lower !== 'location')
      headers.set(key, value);
  });
  headers.set(REQUEST_ID_HEADER, requestId);
  return headers;
}
