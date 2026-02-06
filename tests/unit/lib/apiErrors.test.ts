import {
  HttpError,
  extractBackendMessage,
  fallbackStatus,
  toHttpError,
} from '@/lib/api/errors/utils/errors';
import { normalizeApiError } from '@/lib/errors/errors';

describe('api errors helpers', () => {
  it('extracts backend message/ detail variants', () => {
    expect(extractBackendMessage('  plain  ')).toBe('plain');
    expect(extractBackendMessage({ detail: 'bad request' })).toBe(
      'bad request',
    );
    expect(extractBackendMessage({ message: 'oops' })).toBe('oops');
    expect(extractBackendMessage({ detail: '   ', message: 'fine' })).toBe(
      'fine',
    );
    expect(extractBackendMessage({})).toBeNull();
  });

  it('skips plain strings when allowPlainString is false', () => {
    expect(extractBackendMessage('plain', false)).toBeNull();
  });

  it('falls back to default status when missing', () => {
    expect(fallbackStatus({ status: 500 }, 400)).toBe(500);
    expect(fallbackStatus({}, 400)).toBe(400);
    expect(fallbackStatus(null, 401)).toBe(401);
  });

  it('wraps different error shapes into HttpError', () => {
    const httpErr = new HttpError(418, 'teapot');
    expect(toHttpError(httpErr, { status: 500, message: 'x' })).toBe(httpErr);

    const typeErr = new TypeError('network');
    const wrappedType = toHttpError(typeErr, { status: 500, message: 'x' });
    expect(wrappedType).toBeInstanceOf(HttpError);
    expect(wrappedType.status).toBe(0);

    const objectErr = { status: 503, message: 'backend down' };
    const wrappedObj = toHttpError(objectErr, { status: 500, message: 'x' });
    expect(wrappedObj).toMatchObject({ status: 503, message: 'backend down' });

    const unknown = toHttpError('boom', { status: 500, message: 'fallback' });
    expect(unknown).toMatchObject({ status: 500, message: 'fallback' });
  });

  it('normalizes api errors with actionable messages', () => {
    expect(normalizeApiError({ status: 401, message: 'nope' }).action).toBe(
      'signin',
    );
    expect(
      normalizeApiError({ status: 404, message: 'missing' }).message,
    ).toContain('Not found');
    expect(
      normalizeApiError({
        status: 429,
        details: { error: { code: 'rate_limit' } },
      }).code,
    ).toBe('rate_limit');
    expect(
      normalizeApiError({ status: 0, message: 'Network' }).message,
    ).toContain('Request timed out');
    expect(normalizeApiError({ status: 500, message: 'boom' }).action).toBe(
      'contact_support',
    );
  });

  it('extracts code from nested detail.code', () => {
    expect(
      normalizeApiError({
        status: 400,
        details: { code: 'validation_error' },
      }).code,
    ).toBe('validation_error');
  });

  it('extracts code from top-level error object', () => {
    expect(normalizeApiError({ code: 'direct_code', status: 400 }).code).toBe(
      'direct_code',
    );
  });

  it('handles 403 as signin action', () => {
    expect(
      normalizeApiError({ status: 403, message: 'forbidden' }).action,
    ).toBe('signin');
  });

  it('handles 408 as retry action', () => {
    expect(normalizeApiError({ status: 408, message: 'timeout' }).action).toBe(
      'retry',
    );
  });

  it('handles 504 as retry action', () => {
    expect(
      normalizeApiError({ status: 504, message: 'gateway timeout' }).action,
    ).toBe('retry');
  });

  it('falls back to retry for other errors', () => {
    expect(
      normalizeApiError({ status: 400, message: 'bad request' }).action,
    ).toBe('retry');
  });
});
