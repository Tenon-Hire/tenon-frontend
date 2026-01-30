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

  it('returns null when performance.now is not a function', async () => {
    setPerformance({ now: 'not-a-function' } as unknown as Performance);
    const { nowMs } = await import('@/features/recruiter/dashboard/utils/perf');
    expect(nowMs()).toBeNull();
  });

  it('does not log when performance.now returns null', async () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = 'true';
    setPerformance(undefined);
    const infoSpy = jest
      .spyOn(console, 'info')
      .mockImplementation(() => undefined);
    const { logPerf } =
      await import('@/features/recruiter/dashboard/utils/perf');

    logPerf('test-label', 1000);
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('logs without durationMs when startedAt is undefined', async () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = 'true';
    setPerformance({ now: () => 3000 } as Performance);
    const infoSpy = jest
      .spyOn(console, 'info')
      .mockImplementation(() => undefined) as Mock;
    const { logPerf } =
      await import('@/features/recruiter/dashboard/utils/perf');

    logPerf('no-start');
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[tenon][perf] no-start'),
      expect.objectContaining({ atMs: 3000 }),
    );
    const payload = infoSpy.mock.calls[0][1];
    expect(payload.durationMs).toBeUndefined();
  });

  it('enables debug with "1" as env value', async () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = '1';
    setPerformance({ now: () => 1000 } as Performance);
    const infoSpy = jest
      .spyOn(console, 'info')
      .mockImplementation(() => undefined);
    const { logPerf } =
      await import('@/features/recruiter/dashboard/utils/perf');

    logPerf('enabled');
    expect(infoSpy).toHaveBeenCalled();
  });
});
