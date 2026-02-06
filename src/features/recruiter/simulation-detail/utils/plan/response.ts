export async function safeParseResponse(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') ?? '';
  const tryJson =
    contentType.includes('application/json') || contentType.includes('+json');
  try {
    if (tryJson && typeof res.json === 'function') {
      return await res.json();
    }
    if (contentType.includes('text/') && typeof res.text === 'function') {
      return await res.text();
    }
    if (typeof res.arrayBuffer === 'function') return await res.arrayBuffer();
  } catch {}

  try {
    const clone = typeof res.clone === 'function' ? res.clone() : null;
    if (clone && typeof clone.text === 'function') {
      return await clone.text();
    }
  } catch {}

  return null;
}
