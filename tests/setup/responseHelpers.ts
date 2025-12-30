export type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
  headers: { get: (key: string) => string | null };
};

export function jsonResponse(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
): MockResponse {
  const text = JSON.stringify(body);
  const headerMap = headers ?? { 'content-type': 'application/json' };

  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => text,
    headers: {
      get: (key: string) => {
        const lower = key.toLowerCase();
        return (
          headerMap[lower] ??
          headerMap[key] ??
          (lower === 'content-type' ? 'application/json' : null)
        );
      },
    },
  };
}

export function textResponse(
  body: string,
  status = 200,
  headers?: Record<string, string>,
): MockResponse {
  const headerMap = headers ?? { 'content-type': 'text/plain' };

  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new Error('Invalid JSON');
    },
    text: async () => body,
    headers: {
      get: (key: string) => {
        const lower = key.toLowerCase();
        return (
          headerMap[lower] ??
          headerMap[key] ??
          (lower === 'content-type' ? 'text/plain' : null)
        );
      },
    },
  };
}

export function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}
