import { normalizeApiError } from '@/lib/errors/errors';

describe('normalizeApiError', () => {
  const fallback = 'fallback';

  const make = (status: number, extra?: Record<string, unknown>) => ({
    status,
    message: extra?.message ?? '',
    ...(extra ?? {}),
  });

  it.each([
    [401, 'Session expired. Please sign in again.', 'signin'],
    [403, 'Session expired. Please sign in again.', 'signin'],
    [404, 'Not found. Refresh or reopen the link.', 'refresh'],
    [429, 'Too many attempts. Please wait and retry.', 'retry'],
    [408, 'Request timed out. Check your connection and retry.', 'retry'],
    [504, 'Request timed out. Check your connection and retry.', 'retry'],
    [0, 'Request timed out. Check your connection and retry.', 'retry'],
    [500, 'Server issue. Please retry or contact support.', 'contact_support'],
  ])('maps status %s to action/message', (status, expectedMsg, action) => {
    const result = normalizeApiError(make(status));
    expect(result.status).toBe(status);
    expect(result.message).toBe(expectedMsg);
    expect(result.action).toBe(action);
  });

  it('extracts nested error code from details', () => {
    const err = { status: 422, details: { code: 'E_DETAIL' } };
    const result = normalizeApiError(err, fallback);
    expect(result.code).toBe('E_DETAIL');
    expect(result.message).toBe(fallback);
  });

  it('falls back to retry with user message when no status', () => {
    const result = normalizeApiError({ message: 'oops' }, fallback);
    expect(result.status).toBeNull();
    expect(result.message).toBe('oops');
    expect(result.action).toBe('retry');
  });
});
