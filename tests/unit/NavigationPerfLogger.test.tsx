import { waitFor, render } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

describe('NavigationPerfLogger', () => {
  const originalEnv = process.env.NEXT_PUBLIC_TENON_DEBUG_PERF;
  let logSpy: jest.SpyInstance;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = 'true';
    const perfStub = performance as unknown as {
      getEntriesByType?: (type: string) => PerformanceEntry[];
    };
    perfStub.getEntriesByType ??= () => [];
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = originalEnv;
  });

  it('logs navigation timing when enabled', async () => {
    const perfSpy = jest
      .spyOn(performance, 'getEntriesByType')
      .mockReturnValue([{ duration: 12 }] as unknown as PerformanceEntry[]);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const { NavigationPerfLogger } =
      await import('@/features/shared/analytics/NavigationPerfLogger');

    render(<NavigationPerfLogger />);

    await waitFor(() =>
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[perf:navigation] /dashboard'),
      ),
    );

    perfSpy.mockRestore();
    logSpy.mockRestore();
  });
});
