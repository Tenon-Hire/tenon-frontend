import React from 'react';
import { render } from '@testing-library/react';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useEffect: (fn: () => void) => fn(),
  };
});

const usePathnameMock = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

describe('NavigationPerfLogger', () => {
  const originalEnv = process.env.NEXT_PUBLIC_TENON_DEBUG_PERF;
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const importLogger = () =>
    import('@/features/shared/analytics/NavigationPerfLogger');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = '0';
    usePathnameMock.mockReturnValue('/dashboard');
    Object.defineProperty(globalThis, 'performance', {
      configurable: true,
      value: {
        getEntriesByType: jest.fn(() => [{ duration: 42 }]),
        now: jest.fn(() => 99),
      } as unknown as Performance,
    });
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = originalEnv;
    consoleLogSpy.mockRestore();
    const globalWithPerf = globalThis as { performance?: Performance };
    delete globalWithPerf.performance;
  });

  it('logs navigation performance when debug flag enabled', async () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = 'true';
    const { NavigationPerfLogger } = await importLogger();
    render(<NavigationPerfLogger />);
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('skips logging when debug flag disabled', async () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = 'false';
    const { NavigationPerfLogger } = await importLogger();
    render(<NavigationPerfLogger />);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('does nothing when performance API is unavailable', async () => {
    const globalWithPerf = globalThis as { performance?: Performance };
    delete globalWithPerf.performance;
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = 'true';
    const { NavigationPerfLogger } = await importLogger();
    render(<NavigationPerfLogger />);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});
