import { stripTrailingApiSegment } from './stripTrailingApi';

export function getBackendBaseUrl(): string {
  const raw = process.env.TENON_BACKEND_BASE_URL ?? 'http://localhost:8000';
  return stripTrailingApiSegment(raw);
}

export async function parseUpstreamBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return (await res.json()) as unknown;
    } catch {
      return undefined;
    }
  }

  try {
    return await res.text();
  } catch {
    return undefined;
  }
}
