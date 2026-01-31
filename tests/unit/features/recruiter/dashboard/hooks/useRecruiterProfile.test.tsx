import { act, renderHook } from '@testing-library/react';
import { useRecruiterProfile } from '@/features/recruiter/dashboard/hooks/useRecruiterProfile';

const getMock = jest.fn();
let locationAssign: jest.Mock;

jest.mock('@/lib/api/httpClient', () => ({
  recruiterBffClient: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

jest.mock('@/lib/auth/routing', () => ({
  buildLoginUrl: (_mode: string, returnTo: string) =>
    `/auth/login?returnTo=${returnTo}`,
  buildNotAuthorizedUrl: (_mode: string, returnTo: string) =>
    `/not-authorized?returnTo=${returnTo}`,
  buildReturnTo: () => '/return',
}));

describe('useRecruiterProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    locationAssign = jest.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { assign: locationAssign },
    });
  });

  it('returns initial profile when provided and skip fetch', () => {
    const { result } = renderHook(() =>
      useRecruiterProfile({
        initialProfile: { name: 'R' },
        fetchOnMount: false,
      }),
    );
    expect(result.current.profile?.name).toBe('R');
    expect(result.current.loading).toBe(false);
  });

  it('loads profile and clears error on success', async () => {
    getMock.mockResolvedValue({ name: 'Recruiter' });
    const { result } = renderHook(() => useRecruiterProfile());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.profile?.name).toBe('Recruiter');
    expect(result.current.error).toBeNull();
  });

  it('redirects on 401/403', async () => {
    getMock.mockRejectedValue({ status: 401 });
    renderHook(() => useRecruiterProfile());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(locationAssign).toHaveBeenCalled();
  });

  it('sets friendly error on failure', async () => {
    getMock.mockRejectedValue({ status: 500, message: 'bad' });
    const { result } = renderHook(() => useRecruiterProfile());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.error).toBe('bad');
  });
});
