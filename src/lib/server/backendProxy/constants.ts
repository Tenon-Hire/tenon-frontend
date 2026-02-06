export const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'host',
  'content-length',
  'accept-encoding',
  'upgrade',
  'keep-alive',
  'transfer-encoding',
  'cookie',
]);

export const MAX_PROXY_BODY_BYTES = Number(
  process.env.TENON_PROXY_MAX_BODY_BYTES ?? 2 * 1024 * 1024,
);
export const PROXY_TIMEOUT_MS = 20000;
export const LONG_PROXY_TIMEOUT_MS = 90000;
export const MAX_PROXY_RESPONSE_BYTES = Number(
  process.env.TENON_PROXY_MAX_RESPONSE_BYTES ?? 2 * 1024 * 1024,
);

export const DEBUG_PROXY =
  process.env.TENON_DEBUG_PROXY === 'true' ||
  process.env.TENON_DEBUG === 'true';
