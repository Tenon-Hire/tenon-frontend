import {
  extractPermissions,
  getUserEmail,
  normalizeUserClaims,
} from '@/lib/auth0-claims';

const makeToken = (claims: Record<string, unknown>) => {
  const header = Buffer.from('{}').toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.sig`;
};

describe('auth0-claims branch coverage', () => {
  it('retains user permissions when already present', () => {
    const claims = normalizeUserClaims({
      permissions: ['keep'],
      'https://tenon.dev/perms': ['ns'],
    });
    expect(claims.permissions).toEqual(['keep']);
  });

  it('extracts roles from token when user empty and token lacks perms', () => {
    const token = makeToken({ roles: ['Candidate'] });
    expect(extractPermissions({}, token)).toEqual(
      expect.arrayContaining(['candidate:access']),
    );
  });

  it('returns null email when none present', () => {
    expect(getUserEmail({})).toBeNull();
  });
});
