import {
  coerceError,
  errorDetailEnabled,
  isNotFound,
  normalizeApiError,
  toStatus,
  toUserMessage,
} from '@/lib/errors/errors';

describe('lib/errors/errors', () => {
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
    process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = 'TRUE';
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
    process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = 'TRUE';
    const err = { detail: 'secret', message: 'shown' };
    expect(toUserMessage(err, 'fallback', { includeDetail: false })).toBe(
      'shown',
    );
  });

  it('returns fallback when nothing usable is present', () => {
    expect(toUserMessage({}, 'fallback')).toBe('fallback');
  });

  it('redacts bearer tokens and jwt-like strings', () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = 'TRUE';
    const err = new Error(
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
    );
    expect(toUserMessage(err, 'fallback')).toBe('Bearer [redacted]');
  });

  it('redacts token params in messages', () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = 'TRUE';
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

  describe('normalizeApiError', () => {
    it('returns signin action for 401 and 403', () => {
      const result401 = normalizeApiError({ status: 401 });
      expect(result401.action).toBe('signin');
      expect(result401.message).toContain('sign in');

      const result403 = normalizeApiError({ status: 403 });
      expect(result403.action).toBe('signin');
    });

    it('returns refresh action for 404', () => {
      const result = normalizeApiError({ status: 404 });
      expect(result.action).toBe('refresh');
      expect(result.message).toContain('Not found');
    });

    it('returns retry action for 429', () => {
      const result = normalizeApiError({ status: 429 });
      expect(result.action).toBe('retry');
      expect(result.message).toContain('Too many attempts');
    });

    it('returns retry action for timeout statuses', () => {
      expect(normalizeApiError({ status: 408 }).action).toBe('retry');
      expect(normalizeApiError({ status: 504 }).action).toBe('retry');
      expect(normalizeApiError({ status: 0 }).action).toBe('retry');
    });

    it('returns contact_support for 5xx errors', () => {
      const result = normalizeApiError({ status: 500 });
      expect(result.action).toBe('contact_support');
      expect(result.message).toContain('Server issue');
    });

    it('extracts error code from nested error object', () => {
      const err = { status: 400, error: { code: 'VALIDATION_ERROR' } };
      const result = normalizeApiError(err);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('extracts error code from detail object', () => {
      const err = { status: 400, detail: { code: 'DETAIL_CODE' } };
      const result = normalizeApiError(err);
      expect(result.code).toBe('DETAIL_CODE');
    });

    it('extracts error code from details object', () => {
      const err = { status: 400, details: { code: 'DETAILS_CODE' } };
      const result = normalizeApiError(err);
      expect(result.code).toBe('DETAILS_CODE');
    });

    it('returns default retry for other status codes', () => {
      const result = normalizeApiError({ status: 400, message: 'Bad input' });
      expect(result.action).toBe('retry');
      expect(result.message).toBe('Bad input');
    });
  });

  describe('errorDetailEnabled', () => {
    it('returns false when env is empty', () => {
      delete process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS;
      expect(errorDetailEnabled()).toBe(false);
    });

    it('returns true for "1"', () => {
      process.env.NEXT_PUBLIC_TENON_DEBUG_ERRORS = '1';
      expect(errorDetailEnabled()).toBe(true);
    });
  });

  describe('coerceError edge cases', () => {
    it('returns error instance unchanged', () => {
      const original = new Error('original');
      expect(coerceError(original)).toBe(original);
    });
  });
});
