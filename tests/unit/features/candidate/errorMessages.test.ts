import {
  friendlyBootstrapError,
  friendlySubmitError,
  friendlyTaskError,
  friendlyClaimError,
} from '@/features/candidate/session/utils/errorMessages';
import { HttpError } from '@/features/candidate/api';

describe('candidate error messages', () => {
  it('maps bootstrap statuses to friendly messages', () => {
    expect(friendlyBootstrapError(new HttpError(400, 'x'))).toContain(
      'no longer valid',
    );
    expect(friendlyBootstrapError(new HttpError(404, 'x'))).toContain(
      'no longer valid',
    );
    expect(friendlyBootstrapError(new HttpError(409, 'x'))).toContain(
      'no longer valid',
    );
    expect(friendlyBootstrapError(new HttpError(401, 'x'))).toContain(
      'sign in',
    );
    expect(friendlyBootstrapError(new HttpError(403, 'x'))).toContain(
      'sign in',
    );
    expect(friendlyBootstrapError(new HttpError(410, 'x'))).toContain(
      'expired or was already used',
    );
    expect(friendlyBootstrapError(new Error('Backend fail'))).toContain(
      'Network error',
    );
  });

  it('maps claim errors including auth mismatch', () => {
    expect(friendlyClaimError(new HttpError(401, ''))).toContain('sign in');
    expect(friendlyClaimError(new HttpError(410, 'x'))).toContain('expired');
    expect(friendlyClaimError(new HttpError(403, 'use this'))).toContain(
      'sign in',
    );
    expect(friendlyClaimError(new HttpError(500, ''))).toContain(
      'Unable to claim',
    );
  });

  it('maps task errors for missing session and network', () => {
    expect(friendlyTaskError(new HttpError(400, 'x'))).toContain(
      'no longer valid',
    );
    expect(friendlyTaskError(new HttpError(404, 'x'))).toContain(
      'no longer valid',
    );
    expect(friendlyTaskError(new HttpError(410, 'x'))).toContain('expired');
    expect(friendlyTaskError(new HttpError(0, 'offline'))).toContain(
      'Network error',
    );
    expect(friendlyTaskError(new HttpError(500, 'Custom task'))).toBe(
      'Custom task',
    );
    expect(friendlyTaskError(new HttpError(502, ''))).toBe(
      'Something went wrong loading your current task.',
    );
  });

  it('maps submit errors for order and conflict', () => {
    expect(friendlySubmitError(new HttpError(400, 'order'))).toBe(
      'Task out of order.',
    );
    expect(friendlySubmitError(new HttpError(409, 'conflict'))).toBe(
      'Task already submitted.',
    );
    expect(friendlySubmitError(new HttpError(0, ''))).toContain(
      'Network error',
    );
    expect(friendlySubmitError(new HttpError(500, 'specific'))).toBe(
      'specific',
    );
  });

  it('handles bootstrap defaults when status present', () => {
    expect(friendlyBootstrapError(new HttpError(502, ''))).toBe(
      'Something went wrong loading your simulation.',
    );
  });

  it('handles submit 404 as session mismatch', () => {
    expect(friendlySubmitError(new HttpError(404, ''))).toBe(
      'Session mismatch. Please reopen your invite link.',
    );
  });

  it('handles submit 410 as expired', () => {
    expect(friendlySubmitError(new HttpError(410, ''))).toBe(
      'That invite link has expired.',
    );
  });

  it('handles claim 400, 404, 409 as invite unavailable', () => {
    expect(friendlyClaimError(new HttpError(400, ''))).toContain(
      'no longer valid',
    );
    expect(friendlyClaimError(new HttpError(404, ''))).toContain(
      'no longer valid',
    );
    expect(friendlyClaimError(new HttpError(409, ''))).toContain(
      'no longer valid',
    );
  });

  it('handles claim network error when status is 0', () => {
    expect(friendlyClaimError(new HttpError(0, ''))).toContain('Network error');
  });

  it('handles claim error with custom message', () => {
    expect(friendlyClaimError(new HttpError(502, 'Custom claim error'))).toBe(
      'Custom claim error',
    );
  });

  it('handles task error with 409 status', () => {
    expect(friendlyTaskError(new HttpError(409, ''))).toContain(
      'no longer valid',
    );
  });

  it('handles bootstrap error with message from object without status', () => {
    const err = { message: 'Custom bootstrap message' };
    expect(friendlyBootstrapError(err)).toContain('Network error');
  });

  it('handles bootstrap error with whitespace-only message', () => {
    expect(friendlyBootstrapError(new HttpError(503, '   '))).toBe(
      'Something went wrong loading your simulation.',
    );
  });

  it('handles task error with whitespace-only message', () => {
    expect(friendlyTaskError(new HttpError(503, '  '))).toBe(
      'Something went wrong loading your current task.',
    );
  });

  it('handles claim error with whitespace-only message', () => {
    expect(friendlyClaimError(new HttpError(503, '  '))).toBe(
      'Unable to claim your invite right now. Please try again.',
    );
  });
});
