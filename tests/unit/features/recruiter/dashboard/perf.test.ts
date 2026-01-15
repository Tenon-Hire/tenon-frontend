import type { Mock } from 'jest-mock';

describe('dashboard perf utilities', () => {
  const originalEnv = process.env.NEXT_PUBLIC_TENON_DEBUG_PERF;
  const originalPerformance = global.performance;
  const setPerformance = (value: Performance | undefined) => {
    Object.defineProperty(global, 'performance', {
      value,
      writable: true,
      configurable: true,
    });
  };

  afterEach(() => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = originalEnv;
    setPerformance(originalPerformance);
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('returns null when performance is unavailable', async () => {
    setPerformance(undefined);
    const { nowMs } = await import('@/features/recruiter/dashboard/utils/perf');
    expect(nowMs()).toBeNull();
  });

  it('does not log when perf debug is disabled', async () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = 'false';
    const infoSpy = jest
      .spyOn(console, 'info')
      .mockImplementation(() => undefined);
    const { logPerf } =
      await import('@/features/recruiter/dashboard/utils/perf');

    logPerf('noop');
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('logs perf payload when enabled and performance exists', async () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = 'true';
    setPerformance({ now: () => 2000 } as Performance);
    const infoSpy = jest
      .spyOn(console, 'info')
      .mockImplementation(() => undefined) as Mock;
    const { logPerf } =
      await import('@/features/recruiter/dashboard/utils/perf');

    logPerf('dashboard', 1000, { status: 200 });
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[tenon][perf] dashboard'),
      expect.objectContaining({ durationMs: 1000, status: 200 }),
    );
  });
});
