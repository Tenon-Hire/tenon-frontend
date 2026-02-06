export async function readStreamWithLimit(res: Response, limit: number) {
  if (!res.body)
    return { buffer: undefined as ArrayBuffer | undefined, exceeded: false };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > limit) {
        if (typeof res.body.cancel === 'function')
          await res.body.cancel().catch(() => undefined);
        return { exceeded: true };
      }
      chunks.push(value);
    }
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return { buffer: merged.buffer, exceeded: false };
}
