import {
  friendlyBootstrapError,
  friendlyTaskError,
  friendlyClaimError,
  friendlySubmitError,
} from '@/features/candidate/session/utils/errorMessages';

const httpErr = (status: number, message?: string) =>
  Object.assign(new Error(message ?? `err-${status}`), { status });

describe('candidate error messages', () => {
  it('handles bootstrap errors by status', () => {
    expect(friendlyBootstrapError(httpErr(401))).toMatch(/sign in/i);
    expect(friendlyBootstrapError(httpErr(403))).toMatch(/confirm your email/i);
    expect(friendlyBootstrapError(httpErr(410))).toMatch(/expired/i);
    expect(friendlyBootstrapError(httpErr(0))).toMatch(/Network/i);
    expect(friendlyBootstrapError(httpErr(500, 'boom'))).toBe('boom');
  });

  it('handles task errors by status', () => {
    expect(friendlyTaskError(httpErr(410))).toMatch(/expired/i);
    expect(friendlyTaskError(httpErr(0))).toMatch(/Network/i);
    expect(friendlyTaskError(httpErr(500, 'x'))).toBe('x');
  });

  it('handles claim errors by status', () => {
    expect(friendlyClaimError(httpErr(401))).toMatch(/sign in again/i);
    expect(friendlyClaimError(httpErr(403))).toMatch(/confirm your email/i);
    expect(friendlyClaimError(httpErr(410))).toMatch(/expired/i);
    expect(friendlyClaimError(httpErr(0))).toMatch(/Network/i);
    expect(friendlyClaimError(httpErr(500, 'y'))).toBe('y');
  });

  it('handles submit errors by status', () => {
    expect(friendlySubmitError(httpErr(400))).toMatch(/out of order/i);
    expect(friendlySubmitError(httpErr(409))).toMatch(/already submitted/i);
    expect(friendlySubmitError(httpErr(404))).toMatch(/Session mismatch/i);
    expect(friendlySubmitError(httpErr(410))).toMatch(/expired/i);
    expect(friendlySubmitError(httpErr(0))).toMatch(/Network/i);
    expect(friendlySubmitError(httpErr(500, 'detail'))).toBe('detail');
  });
});
