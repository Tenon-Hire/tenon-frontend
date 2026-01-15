import {
  coerceError,
  errorDetailEnabled,
  isNotFound,
  toStatus,
  toUserMessage,
} from '@/lib/utils/errors';

describe('lib/utils/errors', () => {
  const originalDebugErrors = process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS;

  afterEach(() => {
    if (originalDebugErrors === undefined) {
      delete process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS;
    } else {
      process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = originalDebugErrors;
    }
  });

  it('extracts numeric status when present', () => {
    expect(toStatus({ status: 404 })).toBe(404);
    expect(toStatus({ status: '404' })).toBeNull();
    expect(toStatus(null)).toBeNull();
  });

  it('prefers Error message over object fields', () => {
    const err = new Error('boom');
    expect(toUserMessage(err, 'fallback')).toBe('boom');
  });

  it('returns detail when includeDetail is set', () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = 'true';
    expect(errorDetailEnabled()).toBe(true);
    const err = { detail: 'detail msg', message: 'msg' };
    expect(toUserMessage(err, 'fallback', { includeDetail: true })).toBe(
      'detail msg',
    );
  });

  it('trims and falls back to message when detail absent', () => {
    const err = { message: '  spaced  ' };
    expect(toUserMessage(err, 'fallback')).toBe('spaced');
  });

  it('ignores detail when includeDetail is false', () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = 'true';
    const err = { detail: 'secret', message: 'shown' };
    expect(toUserMessage(err, 'fallback', { includeDetail: false })).toBe(
      'shown',
    );
  });

  it('returns fallback when nothing usable is present', () => {
    expect(toUserMessage({}, 'fallback')).toBe('fallback');
  });

  it('redacts bearer tokens and jwt-like strings', () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = 'true';
    const err = new Error(
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
    );
    expect(toUserMessage(err, 'fallback')).toBe('Bearer [redacted]');
  });

  it('redacts token params in messages', () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = 'true';
    const err = {
      message: 'Request failed: ?access_token=abc123&id_token=def456',
    };
    expect(toUserMessage(err, 'fallback')).toBe(
      'Request failed: ?access_token=[redacted]&id_token=[redacted]',
    );
  });

  it('detects not found via status', () => {
    expect(isNotFound({ status: 404 })).toBe(true);
    expect(isNotFound({ status: 500 })).toBe(false);
  });

  it('coerces different error shapes to Error', () => {
    const errObj = coerceError({ message: 'custom' });
    expect(errObj).toBeInstanceOf(Error);
    expect(errObj.message).toBe('Unknown error');

    const errStr = coerceError('text');
    expect(errStr.message).toBe('text');
  });
});
