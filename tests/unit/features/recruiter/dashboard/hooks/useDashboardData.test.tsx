import { act, renderHook } from '@testing-library/react';
import { useDashboardData } from '@/features/recruiter/dashboard/hooks/useDashboardData';

const fetchDashboard = jest.fn();
const logPerfMock = jest.fn();
let locationAssign: jest.Mock;

jest.mock('@/features/recruiter/dashboard/hooks/dashboardApi', () => ({
  fetchDashboard: (...args: unknown[]) => fetchDashboard(...args),
  isAbortError: (err: unknown) =>
    (err as { name?: string })?.name === 'AbortError',
}));

jest.mock('@/features/recruiter/dashboard/utils/perf', () => ({
  dashboardPerfDebugEnabled: true,
  logPerf: (...args: unknown[]) => logPerfMock(...args),
  nowMs: () => 100,
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
    fetchDashboard.mockResolvedValue({
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
    fetchDashboard.mockImplementation(() => {
      window.location.assign('/auth/login?returnTo=/here');
      const error = new Error('unauthorized') as Error & { status?: number };
      error.status = 401;
      return Promise.reject(error);
    });
    const { result } = renderHook(() => useDashboardData());
    await act(async () => {
      await result.current.refresh(true).catch(() => {});
    });
    expect(locationAssign).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
    );
  });

  it('sets user messages on other errors', async () => {
    fetchDashboard.mockRejectedValue({ status: 500, message: 'fail' });
    const { result } = renderHook(() => useDashboardData());

    await act(async () => {
      await result.current.refresh(true).catch(() => {});
    });

    expect(result.current.profileError).toBe('Unable to load your dashboard.');
    expect(result.current.simError).toBe('Unable to load your dashboard.');
  });
});
