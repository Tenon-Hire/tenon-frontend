import { apiClient, login, safeRequest } from '@/lib/api/httpClient';
import { getAuthToken } from '@/lib/auth';
import { responseHelpers } from '../../setup';

jest.mock('@/lib/auth', () => ({
  getAuthToken: jest.fn(),
}));

const fetchMock = jest.fn();

describe('apiClient request helpers', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    (getAuthToken as jest.Mock).mockReset();
  });

  it('attaches auth token by default and normalizes URLs', async () => {
    (getAuthToken as jest.Mock).mockReturnValue('token-123');
    fetchMock.mockResolvedValue(
      responseHelpers.jsonResponse({ ok: true, data: { message: 'hi' } }),
    );

    await apiClient.get('/jobs');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/jobs',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer token-123' },
        body: undefined,
        credentials: 'include',
        cache: 'no-store',
      }),
    );
  });

  it('respects skipAuth and custom basePath', async () => {
    fetchMock.mockResolvedValue(
      responseHelpers.jsonResponse({ created: true, id: 7 }),
    );

    await apiClient.post(
      'tasks',
      { title: 'New' },
      { basePath: 'https://api.example.com', skipAuth: true },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/tasks',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New' }),
        credentials: 'omit',
      }),
    );
  });

  it('does not stringify FormData bodies', async () => {
    const fd = new FormData();
    fd.append('file', 'content');
    fetchMock.mockResolvedValue(responseHelpers.jsonResponse({ ok: true }));

    await apiClient.post('/upload', fd);

    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.body).toBe(fd);
    expect(opts.headers).not.toHaveProperty('Content-Type');
  });

  it('extracts error messages from API errors', async () => {
    fetchMock.mockResolvedValue(
      responseHelpers.jsonResponse(
        { detail: [{ msg: 'Invalid password' }] },
        422,
      ),
    );

    await expect(
      login({ email: 'a@b.com', password: 'x' }),
    ).rejects.toMatchObject({
      message: 'Invalid password',
      status: 422,
    });
  });

  it('falls back to status-based messages for text errors', async () => {
    fetchMock.mockResolvedValue(
      responseHelpers.textResponse('Internal error', 500, {
        'content-type': 'text/plain',
      }),
    );

    await expect(apiClient.get('/oops')).rejects.toMatchObject({
      message: 'Request failed with status 500',
      status: 500,
    });
  });

  it('returns undefined for 204 responses', async () => {
    fetchMock.mockResolvedValue(
      responseHelpers.textResponse('', 204, { 'content-type': '' }),
    );

    const resp = await apiClient.delete('/noop');

    expect(resp).toBeUndefined();
  });

  it('handles malformed JSON bodies gracefully', async () => {
    const badJsonResponse = {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => {
        throw new Error('bad json');
      },
      text: async () => {
        throw new Error('should not call text');
      },
    } as unknown as Response;

    fetchMock.mockResolvedValue(badJsonResponse);

    const resp = await apiClient.get('/bad-json');
    expect(resp).toBeUndefined();
  });

  it('handles text body failures gracefully', async () => {
    const textFailResponse = {
      ok: true,
      status: 200,
      headers: { get: () => 'text/plain' },
      json: async () => {
        throw new Error('not json');
      },
      text: async () => {
        throw new Error('text read failed');
      },
    } as unknown as Response;

    fetchMock.mockResolvedValue(textFailResponse);

    const resp = await apiClient.get('/text-fail');
    expect(resp).toBeUndefined();
  });

  it('supports delete with request options and explicit basePath', async () => {
    fetchMock.mockResolvedValue(responseHelpers.jsonResponse({}, 200));

    await apiClient.delete(
      '/custom-delete',
      { headers: { 'X-Del': '1' } },
      { basePath: 'https://api.dev' },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.dev/custom-delete',
      expect.objectContaining({
        method: 'DELETE',
        headers: { 'X-Del': '1' },
        body: undefined,
        credentials: 'omit',
      }),
    );
  });

  it('passes through provided authToken to request helper', async () => {
    fetchMock.mockResolvedValue(responseHelpers.jsonResponse({}, 200));

    await apiClient.post('/auth', { ok: true }, { authToken: 'tok' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/auth',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer tok',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ok: true }),
        credentials: 'include',
        cache: 'no-store',
      }),
    );
  });

  it('uses explicit authToken and merges headers for put/patch/delete', async () => {
    fetchMock
      .mockResolvedValueOnce(responseHelpers.jsonResponse({ ok: true }))
      .mockResolvedValueOnce(responseHelpers.jsonResponse({ ok: true }))
      .mockResolvedValueOnce(responseHelpers.jsonResponse({ ok: true }));

    await apiClient.put(
      '/put-me',
      { a: 1 },
      { headers: { 'X-Test': 'one' } },
      { authToken: 'custom-token' },
    );

    await apiClient.patch('/patch-me', { b: 2 }, { authToken: 'custom-token' });
    await apiClient.delete('/delete-me', { headers: { 'X-Req': 'del' } });

    const putCall = fetchMock.mock.calls[0] as unknown[];
    const patchCall = fetchMock.mock.calls[1] as unknown[];
    const deleteCall = fetchMock.mock.calls[2] as unknown[];

    expect(putCall[0]).toBe('/api/backend/put-me');
    expect(putCall[1]).toMatchObject({
      method: 'PUT',
      headers: {
        Authorization: 'Bearer custom-token',
        'Content-Type': 'application/json',
        'X-Test': 'one',
      },
    });

    expect(patchCall[1]).toMatchObject({
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer custom-token',
        'Content-Type': 'application/json',
      },
    });

    expect(deleteCall[1]).toMatchObject({
      method: 'DELETE',
      headers: {},
    });
  });

  it('respects provided authToken even when window is defined', async () => {
    (getAuthToken as jest.Mock).mockReturnValue('ignored');
    fetchMock.mockResolvedValue(responseHelpers.jsonResponse({ ok: true }));

    await apiClient.get('/auth-pref', { authToken: 'from-opts' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/auth-pref',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer from-opts' },
        body: undefined,
        credentials: 'include',
        cache: 'no-store',
      }),
    );
  });

  it('safeRequest returns data and wraps unknown errors', async () => {
    fetchMock
      .mockResolvedValueOnce(
        responseHelpers.jsonResponse({ ok: true, value: 1 }),
      )
      .mockRejectedValueOnce('bad');

    const success = await safeRequest<{ value: number }>('/path');
    expect(success).toMatchObject({ data: { value: 1 }, error: null });

    const failure = await safeRequest('/oops');
    expect(failure.data).toBeNull();
    expect(failure.error).toBeInstanceOf(Error);
    expect(failure.error?.message).toBe('bad');
  });
});
