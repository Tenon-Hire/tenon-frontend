import {
  normalizeUserClaims,
  extractPermissions,
  hasPermission,
  getUserEmail,
} from '@/lib/auth0-claims';
import {
  CUSTOM_CLAIM_EMAIL,
  CUSTOM_CLAIM_PERMISSIONS,
  CUSTOM_CLAIM_ROLES,
} from '@/lib/brand';

const makeJwt = (claims: Record<string, unknown>) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.sig`;
};

describe('auth0-claims helpers', () => {
  it('normalizes namespaced permissions, roles, and email', () => {
    const claims = normalizeUserClaims({
      [CUSTOM_CLAIM_PERMISSIONS]: ['a'],
      [CUSTOM_CLAIM_ROLES]: ['Recruiter'],
      [CUSTOM_CLAIM_EMAIL]: '  user@test.com ',
    });
    expect(claims.permissions).toEqual(['a']);
    expect(claims.roles).toEqual(['Recruiter']);
    expect(claims.email).toBe('user@test.com');
  });

  it('extracts permissions from user first, then token, and maps roles', () => {
    const perms = extractPermissions(
      {
        permissions: ['p1'],
        [CUSTOM_CLAIM_ROLES]: ['Candidate'],
      },
      null,
    );
    expect(perms).toEqual(expect.arrayContaining(['p1', 'candidate:access']));

    const token = makeJwt({
      [CUSTOM_CLAIM_PERMISSIONS]: ['p2'],
      [CUSTOM_CLAIM_ROLES]: ['Recruiter'],
    });
    const permsFromToken = extractPermissions({}, token);
    expect(permsFromToken).toEqual(
      expect.arrayContaining(['p2', 'recruiter:access']),
    );
  });

  it('hasPermission checks membership', () => {
    expect(hasPermission(['a', 'b'], 'b')).toBe(true);
    expect(hasPermission(['a'], 'b')).toBe(false);
  });

  it('gets user email from custom claim or regular', () => {
    expect(getUserEmail({ [CUSTOM_CLAIM_EMAIL]: 'foo@test.com' })).toBe(
      'foo@test.com',
    );
    expect(getUserEmail({ email: 'bar@test.com' })).toBe('bar@test.com');
    expect(getUserEmail({})).toBeNull();
  });
});
