import { act, renderHook } from '@testing-library/react';
import { useDashboardQuery } from '@/features/recruiter/dashboard/hooks/useDashboardQuery';

const fetchDashboard = jest.fn();

jest.mock('@/features/recruiter/dashboard/hooks/dashboardApi', () => ({
  fetchDashboard: (...args: unknown[]) => fetchDashboard(...args),
  isAbortError: (err: unknown) =>
    (err as { name?: string })?.name === 'AbortError',
}));

describe('useDashboardQuery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchDashboard.mockReset();
    fetchDashboard.mockResolvedValue({
      profile: null,
      simulations: [],
      profileError: null,
      simulationsError: null,
      requestId: 'rid',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fetches on mount', async () => {
    const { result } = renderHook(() => useDashboardQuery());
    act(() => {
      jest.runOnlyPendingTimers();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchDashboard).toHaveBeenCalledTimes(1);
    expect(result.current.requestId).toBe('rid');
  });
});
