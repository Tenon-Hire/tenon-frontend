/**
 * Additional tests for lib/utils/errors to close coverage gaps
 */
import { normalizeApiError, toStatus, toUserMessage } from '@/lib/utils/errors';

describe('lib/utils/errors extra coverage', () => {
  const originalDebugErrors = process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS;

  afterEach(() => {
    if (originalDebugErrors === undefined) {
      delete process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS;
    } else {
      process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = originalDebugErrors;
    }
  });

  it('toStatus returns null for non-object', () => {
    expect(toStatus('string')).toBeNull();
    expect(toStatus(123)).toBeNull();
    expect(toStatus(undefined)).toBeNull();
  });

  it('normalizeApiError extracts code from top level', () => {
    const err = { status: 400, code: 'TOP_LEVEL_CODE' };
    const result = normalizeApiError(err);
    expect(result.code).toBe('TOP_LEVEL_CODE');
  });

  it('normalizeApiError handles empty string code', () => {
    const err = { status: 400, code: '   ' };
    const result = normalizeApiError(err);
    expect(result.code).toBeNull();
  });

  it('normalizeApiError handles error with empty nested code', () => {
    const err = { status: 400, error: { code: '  ' } };
    const result = normalizeApiError(err);
    expect(result.code).toBeNull();
  });

  it('normalizeApiError handles detail with empty code', () => {
    const err = { status: 400, detail: { code: '' } };
    const result = normalizeApiError(err);
    expect(result.code).toBeNull();
  });

  it('normalizeApiError prefers details.code over top-level code', () => {
    const err = { status: 400, details: { code: 'DETAILS' }, code: 'TOP' };
    const result = normalizeApiError(err);
    expect(result.code).toBe('DETAILS');
  });

  it('toUserMessage uses message object property', () => {
    const err = { message: 'object message' };
    const result = toUserMessage(err, 'fallback');
    expect(result).toBe('object message');
  });

  it('toUserMessage uses fallback when message is empty string', () => {
    const err = { message: '   ' };
    const result = toUserMessage(err, 'fallback');
    expect(result).toBe('fallback');
  });

  it('toUserMessage uses fallback for non-string message', () => {
    const err = { message: 123 };
    const result = toUserMessage(err, 'fallback');
    expect(result).toBe('fallback');
  });

  it('toUserMessage returns detail when enabled and message is empty', () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = '1';
    const err = { detail: 'detail text', message: '' };
    const result = toUserMessage(err, 'fallback', { includeDetail: true });
    expect(result).toBe('detail text');
  });

  it('toUserMessage ignores empty detail', () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = '1';
    const err = { detail: '   ', message: 'msg' };
    const result = toUserMessage(err, 'fallback', { includeDetail: true });
    expect(result).toBe('msg');
  });

  it('normalizeApiError for status 502', () => {
    const result = normalizeApiError({ status: 502 });
    expect(result.action).toBe('contact_support');
    expect(result.status).toBe(502);
  });

  it('normalizeApiError for status 503', () => {
    const result = normalizeApiError({ status: 503 });
    expect(result.action).toBe('contact_support');
    expect(result.status).toBe(503);
  });

  it('normalizeApiError for null/undefined error', () => {
    const result1 = normalizeApiError(null);
    expect(result1.status).toBeNull();
    expect(result1.action).toBe('retry');

    const result2 = normalizeApiError(undefined);
    expect(result2.status).toBeNull();
    expect(result2.action).toBe('retry');
  });

  it('redacts refresh_token and auth_token params', () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = '1';
    const err = {
      message: 'Failed: ?refresh_token=abc123&auth_token=xyz789',
    };
    const result = toUserMessage(err, 'fallback', { includeDetail: true });
    expect(result).toBe(
      'Failed: ?refresh_token=[redacted]&auth_token=[redacted]',
    );
  });

  it('redacts token param', () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = '1';
    const err = { message: 'Error with ?token=secret123' };
    const result = toUserMessage(err, 'fallback', { includeDetail: true });
    expect(result).toBe('Error with ?token=[redacted]');
  });

  it('redacts JWT without bearer prefix', () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = '1';
    const jwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const err = { message: `Token: ${jwt}` };
    const result = toUserMessage(err, 'fallback', { includeDetail: true });
    expect(result).toBe('Token: [redacted]');
  });
});
