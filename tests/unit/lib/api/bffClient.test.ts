jest.mock('@/lib/api/client/request', () => ({
  requestWithMeta: jest.fn(),
}));

import { bffClient } from '@/lib/api/client';
import { requestWithMeta } from '@/lib/api/client/request';

const mockClient = requestWithMeta as unknown as jest.Mock;

describe('bffClient', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns ok result on success', async () => {
    mockClient.mockResolvedValue({ data: { foo: 'bar' }, headers: null });

    const res = await bffClient.get<{ foo: string }>('/test');

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual({ foo: 'bar' });
    }
  });

  it('maps errors with status and message', async () => {
    mockClient.mockRejectedValue({ status: 401, message: 'nope' });

    const res = await bffClient.get('/test');

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.status).toBe(401);
      expect(res.error.message.toLowerCase()).toContain('nope');
    }
  });
});
