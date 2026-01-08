import {
  friendlyBootstrapError,
  friendlySubmitError,
  friendlyTaskError,
  friendlyClaimError,
} from '@/features/candidate/session/utils/errorMessages';
import { HttpError } from '@/lib/api/candidate';

describe('candidate error messages', () => {
  it('maps bootstrap statuses to friendly messages', () => {
    expect(friendlyBootstrapError(new HttpError(404, 'x'))).toContain(
      'invalid',
    );
    expect(friendlyBootstrapError(new HttpError(410, 'x'))).toContain(
      'expired',
    );
    expect(friendlyBootstrapError(new Error('Backend fail'))).toContain(
      'Network error',
    );
  });

  it('maps claim errors including auth mismatch', () => {
    expect(friendlyClaimError(new HttpError(401, ''))).toContain(
      'different email',
    );
    expect(friendlyClaimError(new HttpError(410, 'x'))).toContain('expired');
    expect(friendlyClaimError(new HttpError(401, 'use this'))).toBe('use this');
    expect(friendlyClaimError(new HttpError(500, ''))).toContain(
      'Unable to claim',
    );
  });

  it('maps task errors for missing session and network', () => {
    expect(friendlyTaskError(new HttpError(404, 'x'))).toContain(
      'Session not found',
    );
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
});
