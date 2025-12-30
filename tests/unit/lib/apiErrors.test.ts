import {
  HttpError,
  extractBackendMessage,
  fallbackStatus,
  toHttpError,
} from '@/lib/api/errors';

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
});
