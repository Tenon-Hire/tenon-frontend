export function extractErrorMessage(
  errorBody: unknown,
  status: number,
): string {
  if (typeof errorBody === 'object' && errorBody !== null) {
    const candidate = errorBody as { message?: unknown; detail?: unknown };
    if (typeof candidate.message === 'string') return candidate.message;
    if (typeof candidate.detail === 'string') return candidate.detail;
    if (Array.isArray(candidate.detail) && candidate.detail.length > 0) {
      const first = candidate.detail[0] as { msg?: unknown };
      if (first && typeof first.msg === 'string') return first.msg;
    }
  }
  if (typeof errorBody === 'string') {
    return status >= 500 ? `Request failed with status ${status}` : errorBody;
  }
  return `Request failed with status ${status}`;
}

export async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (response.status === 204) return null;
  const readBody =
    contentType.includes('application/json') || contentType.includes('+json')
      ? async () => response.json()
      : contentType.includes('text/')
        ? async () => response.text()
        : async () => response.arrayBuffer();

  try {
    return await readBody();
  } catch {
    try {
      if (typeof response.clone === 'function') {
        const cloned = response.clone();
        if (typeof cloned.text === 'function') return await cloned.text();
      }
    } catch {}
    return undefined;
  }
}
