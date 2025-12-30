import {
  coerceError,
  isNotFound,
  toStatus,
  toUserMessage,
} from '@/lib/utils/errors';

describe('lib/utils/errors', () => {
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
    const err = { detail: 'secret', message: 'shown' };
    expect(toUserMessage(err, 'fallback', { includeDetail: false })).toBe(
      'shown',
    );
  });

  it('returns fallback when nothing usable is present', () => {
    expect(toUserMessage({}, 'fallback')).toBe('fallback');
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
