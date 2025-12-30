import { fetchRecruiterProfile } from '@/app/(recruiter)/dashboard/profile.server';
import { getAccessToken } from '@/lib/auth0';
import { getBackendBaseUrl } from '@/lib/server/bff';
import { responseHelpers } from '../../../setup';

jest.mock('@/lib/auth0', () => ({
  getAccessToken: jest.fn(),
}));

jest.mock('@/lib/server/bff', () => ({
  getBackendBaseUrl: jest.fn(),
}));

describe('fetchRecruiterProfile', () => {
  const fetchMock = jest.fn();
  const realFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    (getAccessToken as jest.Mock).mockResolvedValue('tok');
    (getBackendBaseUrl as jest.Mock).mockReturnValue('http://api.dev');
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  it('returns profile when backend responds ok', async () => {
    fetchMock.mockResolvedValue(
      responseHelpers.jsonResponse(
        { id: 1, name: 'Jordan', email: 'j@example.com' },
        200,
      ) as unknown as Response,
    );

    const { profile, error } = await fetchRecruiterProfile();
    expect(error).toBeNull();
    expect(profile).toMatchObject({ name: 'Jordan' });
    expect(fetchMock).toHaveBeenCalledWith('http://api.dev/api/auth/me', {
      headers: { Authorization: 'Bearer tok' },
      cache: 'no-store',
    });
  });

  it('returns error when backend is not ok', async () => {
    fetchMock.mockResolvedValue(
      responseHelpers.textResponse('fail body', 500) as unknown as Response,
    );

    const { profile, error } = await fetchRecruiterProfile();
    expect(profile).toBeNull();
    expect(error).toMatch(/Unable to fetch profile \(status 500\): fail body/);
  });

  it('handles unexpected exceptions', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    const { profile, error } = await fetchRecruiterProfile();
    expect(profile).toBeNull();
    expect(error).toMatch(/Unexpected error while loading profile/);
  });

  it('uses fallback error when thrown value is not Error', async () => {
    fetchMock.mockRejectedValue('bad');

    const { profile, error } = await fetchRecruiterProfile();
    expect(profile).toBeNull();
    expect(error).toBe('Unexpected error while loading profile');
  });

  it('handles error path when response text throws', async () => {
    const badResponse = {
      ok: false,
      status: 502,
      text: jest.fn().mockRejectedValue(new Error('fail')),
    };
    fetchMock.mockResolvedValue(badResponse as unknown as Response);

    const { error } = await fetchRecruiterProfile();
    expect(error).toContain('status 502');
  });
});
