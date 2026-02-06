import { getBackendBaseUrl } from '@/lib/server/bff';
import { LONG_PROXY_TIMEOUT_MS, PROXY_TIMEOUT_MS } from './constants';

export type BackendRouteContext = { params: Promise<{ path: string[] }> };

function extractPathSegments(context: BackendRouteContext) {
  const params = (context ?? {}) as {
    params?: Promise<{ path?: string[] | string }>;
  };
  return (
    params.params?.then((p) => {
      const rawPath = p?.path;
      if (Array.isArray(rawPath)) return rawPath;
      if (typeof rawPath === 'string') return [rawPath];
      return [] as string[];
    }) ?? Promise.resolve([] as string[])
  );
}

function chooseTimeout(method: string, segments: string[]) {
  const isRunEndpoint =
    method === 'POST' &&
    segments.length === 3 &&
    segments[0] === 'tasks' &&
    segments[2] === 'run';
  const isCodespaceInit =
    method === 'POST' &&
    segments.length === 4 &&
    segments[0] === 'tasks' &&
    segments[2] === 'codespace' &&
    segments[3] === 'init';
  const isCodespaceStatus =
    method === 'GET' &&
    segments.length === 4 &&
    segments[0] === 'tasks' &&
    segments[2] === 'codespace' &&
    segments[3] === 'status';
  const isSubmitEndpoint =
    method === 'POST' &&
    segments.length === 3 &&
    segments[0] === 'tasks' &&
    segments[2] === 'submit';
  return isRunEndpoint ||
    isCodespaceInit ||
    isCodespaceStatus ||
    isSubmitEndpoint
    ? LONG_PROXY_TIMEOUT_MS
    : PROXY_TIMEOUT_MS;
}

export async function resolveTarget(
  req: Request,
  context: BackendRouteContext,
) {
  const method = req.method.toUpperCase();
  const pathSegments = await extractPathSegments(context);
  const encodedPath = pathSegments.length
    ? pathSegments.map(encodeURIComponent).join('/')
    : '';
  const search =
    (req as { nextUrl?: { search?: string } }).nextUrl?.search ?? '';
  const backendPath = `/api/${encodedPath}${search}`;
  const targetUrl = `${getBackendBaseUrl()}${backendPath}`;
  return {
    method,
    pathSegments,
    backendPath,
    targetUrl,
    timeoutMs: chooseTimeout(method, pathSegments),
  };
}
