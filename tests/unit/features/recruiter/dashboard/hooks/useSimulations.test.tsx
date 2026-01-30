import { act, renderHook } from '@testing-library/react';
import { useSimulations } from '@/features/recruiter/dashboard/hooks/useSimulations';

const listSimulationsMock = jest.fn();
const errorToMessageMock = jest.fn(() => 'friendly-error');

class MockAbortController {
  signal: AbortSignal;
  abort: jest.Mock;
  constructor() {
    this.signal = { aborted: false } as AbortSignal;
    this.abort = jest.fn();
  }
}

global.AbortController =
  MockAbortController as unknown as typeof AbortController;

jest.mock('@/lib/api/recruiter', () => ({
  listSimulations: (...args: unknown[]) => listSimulationsMock(...args),
}));

jest.mock('@/features/recruiter/utils/formatters', () => ({
  errorToMessage: (...args: unknown[]) => errorToMessageMock(...args),
}));

describe('useSimulations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads simulations on mount and returns data', async () => {
    listSimulationsMock.mockResolvedValue([{ id: '1' }]);
    const { result } = renderHook(() => useSimulations());

    await act(async () => {
      await result.current.refresh(true);
    });
    expect(result.current.simulations).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });

  it('returns fallback on error and sets error message', async () => {
    listSimulationsMock.mockRejectedValue(new Error('bad'));
    const { result } = renderHook(() => useSimulations());

    await act(async () => {
      await result.current.refresh(true).catch(() => {});
    });
    expect(result.current.error).toBe('friendly-error');
  });

  it('ignores abort errors', async () => {
    listSimulationsMock.mockRejectedValue({ name: 'AbortError' });
    const { result } = renderHook(() => useSimulations());

    await act(async () => {
      await result.current.refresh(true);
    });
    expect(result.current.error).toBeNull();
  });
});
