import {
  extractPermissions,
  getUserEmail,
  hasPermission,
  normalizeUserClaims,
} from '@/lib/auth0-claims';
import {
  CUSTOM_CLAIM_EMAIL,
  CUSTOM_CLAIM_PERMISSIONS,
  CUSTOM_CLAIM_PERMISSIONS_STR,
  CUSTOM_CLAIM_ROLES,
} from '@/lib/brand';

describe('auth0-claims helpers', () => {
  it('extracts permissions from user object', () => {
    const perms = extractPermissions(
      { permissions: ['candidate:access'] },
      null,
    );
    expect(perms).toContain('candidate:access');
    expect(hasPermission(perms, 'candidate:access')).toBe(true);
  });

  it('falls back to token permissions when user missing', () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      Buffer.from(
        JSON.stringify({
          permissions: ['recruiter:access'],
          [CUSTOM_CLAIM_PERMISSIONS]: ['candidate:access'],
        }),
      ).toString('base64') +
      '.sig';
    const perms = extractPermissions(null, token);
    expect(perms.sort()).toEqual(
      ['candidate:access', 'recruiter:access'].sort(),
    );
  });

  it('maps custom permissions claim on user', () => {
    const perms = extractPermissions(
      { [CUSTOM_CLAIM_PERMISSIONS]: ['recruiter:access'] },
      null,
    );
    expect(perms).toEqual(['recruiter:access']);
  });

  it('supports permissions string claim', () => {
    const perms = extractPermissions(
      {
        [CUSTOM_CLAIM_PERMISSIONS_STR]: 'recruiter:access, candidate:access',
      },
      null,
    );
    expect(perms.sort()).toEqual(
      ['recruiter:access', 'candidate:access'].sort(),
    );
  });

  it('maps roles to permissions when permissions are missing', () => {
    const perms = extractPermissions(
      { [CUSTOM_CLAIM_ROLES]: ['RecruiterAdmin'] },
      null,
    );
    expect(perms).toContain('recruiter:access');
    expect(perms).not.toContain('candidate:access');
  });

  it('maps token roles to permissions when user missing', () => {
    const token =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      Buffer.from(
        JSON.stringify({
          [CUSTOM_CLAIM_ROLES]: ['CandidateUser'],
        }),
      ).toString('base64') +
      '.sig';
    const perms = extractPermissions(null, token);
    expect(perms).toEqual(['candidate:access']);
  });

  it('prefers custom email claim then email', () => {
    expect(getUserEmail({ [CUSTOM_CLAIM_EMAIL]: 'custom@example.com' })).toBe(
      'custom@example.com',
    );
    expect(getUserEmail({ email: 'user@example.com' })).toBe(
      'user@example.com',
    );
    expect(getUserEmail(null)).toBeNull();
  });

  it('normalizes namespaced claims into standard fields', () => {
    const normalized = normalizeUserClaims({
      permissions: [],
      [CUSTOM_CLAIM_PERMISSIONS]: ['candidate:access'],
      [CUSTOM_CLAIM_ROLES]: ['Recruiter'],
      [CUSTOM_CLAIM_EMAIL]: 'tenon@example.com',
    });

    expect(normalized.permissions).toEqual(['candidate:access']);
    expect(normalized.roles).toEqual(['Recruiter']);
    expect(normalized.email).toBe('tenon@example.com');
  });
});
