import React from 'react';
import { render } from '@testing-library/react';

const usePathnameMock = jest.fn(() => '/dashboard');
jest.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

describe('NavigationPerfLogger', () => {
  const originalEnv = process.env.NEXT_PUBLIC_TENON_DEBUG_PERF;
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    usePathnameMock.mockReturnValue('/dashboard');
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = 'true';
    Object.defineProperty(globalThis, 'performance', {
      configurable: true,
      value: {
        getEntriesByType: jest.fn(() => [{ duration: 42 }]),
        now: jest.fn(() => 99),
      } as Performance,
    });
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = originalEnv;
    consoleLogSpy.mockRestore();
    const globalWithPerf = globalThis as { performance?: Performance };
    delete globalWithPerf.performance;
  });

  it('logs navigation performance when debug flag enabled', async () => {
    const { NavigationPerfLogger } =
      await import('@/features/shared/analytics/NavigationPerfLogger');
    render(<NavigationPerfLogger />);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[perf:navigation] /dashboard duration=42'),
    );
  });

  it('skips logging when debug flag disabled', async () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = '0';
    const { NavigationPerfLogger } =
      await import('@/features/shared/analytics/NavigationPerfLogger');
    render(<NavigationPerfLogger />);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('does nothing when performance API is unavailable', async () => {
    const globalWithPerf = globalThis as { performance?: Performance };
    delete globalWithPerf.performance;
    const { NavigationPerfLogger } =
      await import('@/features/shared/analytics/NavigationPerfLogger');
    render(<NavigationPerfLogger />);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});
