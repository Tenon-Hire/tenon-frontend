import { act, renderHook } from '@testing-library/react';
import { useDashboardData } from '@/features/recruiter/dashboard/hooks/useDashboardData';

const getMock = jest.fn();
const logPerfMock = jest.fn();
let locationAssign: jest.Mock;

jest.mock('@/lib/api/httpClient', () => ({
  recruiterBffClient: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

jest.mock('@/features/recruiter/dashboard/utils/perf', () => ({
  dashboardPerfDebugEnabled: true,
  logPerf: (...args: unknown[]) => logPerfMock(...args),
  nowMs: () => 100,
}));

jest.mock('@/lib/auth/routing', () => ({
  buildLoginUrl: (_mode: string, returnTo: string) =>
    `/auth/login?returnTo=${returnTo}`,
  buildNotAuthorizedUrl: (_mode: string, returnTo: string) =>
    `/not-authorized?returnTo=${returnTo}`,
  buildReturnTo: () => '/here',
}));

describe('useDashboardData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    locationAssign = jest.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { assign: locationAssign },
    });
  });

  it('loads dashboard and sets state on success', async () => {
    getMock.mockResolvedValue({
      profile: { name: 'Recruiter' },
      simulations: [{ id: '1' }],
      profileError: null,
      simulationsError: null,
    });

    const { result } = renderHook(() => useDashboardData());

    await act(async () => {
      await result.current.refresh(true);
    });

    expect(result.current.profile?.name).toBe('Recruiter');
    expect(result.current.simulations).toHaveLength(1);
    expect(logPerfMock).toHaveBeenCalled();
    expect(result.current.loadingProfile).toBe(false);
  });

  it('redirects on 401/403 and skips errors', async () => {
    getMock.mockRejectedValue({ status: 401 });
    const { result } = renderHook(() => useDashboardData());
    await act(async () => {
      await result.current.refresh(true).catch(() => {});
    });
    expect(locationAssign).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
    );
  });

  it('sets user messages on other errors', async () => {
    getMock.mockRejectedValue({ status: 500, message: 'fail' });
    const { result } = renderHook(() => useDashboardData());

    await act(async () => {
      await result.current.refresh(true).catch(() => {});
    });

    expect(result.current.profileError).toBe('fail');
    expect(result.current.simError).toBe('fail');
  });
});
