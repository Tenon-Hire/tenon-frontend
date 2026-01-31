/**
 * Tests for WebVitalsLogger
 */
import React from 'react';
import { render } from '@testing-library/react';
import { WebVitalsLogger } from '@/features/shared/analytics/WebVitalsLogger';

const useReportWebVitalsMock = jest.fn();

jest.mock('next/web-vitals', () => ({
  useReportWebVitals: (callback: (metric: unknown) => void) =>
    useReportWebVitalsMock(callback),
}));

describe('WebVitalsLogger', () => {
  let consoleInfoSpy: jest.SpyInstance;
  let capturedCallback: ((metric: unknown) => void) | null = null;

  beforeAll(() => {
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleInfoSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    capturedCallback = null;
    useReportWebVitalsMock.mockImplementation(
      (cb: (metric: unknown) => void) => {
        capturedCallback = cb;
      },
    );
  });

  it('renders null', () => {
    const { container } = render(<WebVitalsLogger />);
    expect(container.firstChild).toBeNull();
  });

  it('registers callback with useReportWebVitals', () => {
    render(<WebVitalsLogger />);
    expect(useReportWebVitalsMock).toHaveBeenCalled();
    expect(capturedCallback).toBeTruthy();
  });

  it('handles LCP metric', () => {
    render(<WebVitalsLogger />);
    expect(capturedCallback).toBeTruthy();

    // The debugPerf flag is checked at module load time
    // With default env (empty), logging should be skipped
    capturedCallback!({ name: 'LCP', id: 'lcp-1', value: 1234.5 });

    // Since debugPerf is false by default, console.info shouldn't be called
    // This test verifies the callback is called without error
  });

  it('handles CLS metric', () => {
    render(<WebVitalsLogger />);
    expect(capturedCallback).toBeTruthy();

    capturedCallback!({ name: 'CLS', id: 'cls-1', value: 0.123456 });
    // Test that it doesn't throw
  });

  it('handles INP metric', () => {
    render(<WebVitalsLogger />);
    expect(capturedCallback).toBeTruthy();

    capturedCallback!({ name: 'INP', id: 'inp-1', value: 200.8 });
    // Test that it doesn't throw
  });

  it('handles non-watched metrics', () => {
    render(<WebVitalsLogger />);
    expect(capturedCallback).toBeTruthy();

    capturedCallback!({ name: 'FCP', id: 'fcp-1', value: 500 });
    // Test that it doesn't throw
  });

  it('handles TTFB metric', () => {
    render(<WebVitalsLogger />);
    expect(capturedCallback).toBeTruthy();

    capturedCallback!({ name: 'TTFB', id: 'ttfb-1', value: 100 });
    // Test that it doesn't throw
  });
});
