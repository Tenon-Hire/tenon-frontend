import React from 'react';
import { render } from '@testing-library/react';

const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
const useReportWebVitalsMock = jest.fn();

jest.mock('next/web-vitals', () => ({
  useReportWebVitals: (handler: unknown) => useReportWebVitalsMock(handler),
}));

describe('WebVitalsLogger', () => {
  const originalEnv = process.env.NEXT_PUBLIC_TENON_DEBUG_PERF;

  beforeEach(() => {
    jest.clearAllMocks();
    delete require.cache[
      require.resolve('@/features/shared/analytics/WebVitalsLogger')
    ];
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = originalEnv;
    consoleInfoSpy.mockRestore();
  });

  it('logs watched metrics when debug flag enabled', () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = 'true';
    const { WebVitalsLogger } = require('@/features/shared/analytics/WebVitalsLogger');
    render(<WebVitalsLogger />);

    const handler = useReportWebVitalsMock.mock.calls[0][0] as (
      metric: any,
    ) => void;

    handler({ id: '1', name: 'LCP', value: 1234.56 });
    handler({ id: '2', name: 'CLS', value: 0.123456 });

    expect(consoleInfoSpy).toHaveBeenCalledTimes(2);
    const clsPayload = consoleInfoSpy.mock.calls[1][1] as {
      name: string;
      value: number;
    };
    expect(clsPayload.name).toBe('CLS');
    expect(clsPayload.value).toBeCloseTo(0.1235);
  });

  it('ignores untracked metrics and when debug disabled', () => {
    process.env.NEXT_PUBLIC_TENON_DEBUG_PERF = '0';
    const { WebVitalsLogger } = require('@/features/shared/analytics/WebVitalsLogger');
    render(<WebVitalsLogger />);
    const handler = useReportWebVitalsMock.mock.calls[0][0] as (
      metric: any,
    ) => void;
    handler({ id: 'x', name: 'FCP', value: 10 });
    expect(consoleInfoSpy).not.toHaveBeenCalled();
  });
});
