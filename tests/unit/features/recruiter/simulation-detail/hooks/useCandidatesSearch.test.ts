import { act, renderHook } from '@testing-library/react';
import { useCandidatesSearch } from '@/features/recruiter/simulations/detail/hooks/useCandidatesSearch';

jest.useFakeTimers();

const mockCandidates = [
  {
    id: '1',
    candidateName: 'Alice Smith',
    inviteEmail: 'alice@example.com',
    startedAt: '2023-01-01T00:00:00Z',
    completedAt: null,
    status: 'invited',
  },
  {
    id: '2',
    candidateName: 'Bob Jones',
    inviteEmail: 'bob@example.com',
    startedAt: '2023-01-02T00:00:00Z',
    completedAt: null,
    status: 'in_progress',
  },
] as unknown as Parameters<typeof useCandidatesSearch>[0]['candidates'];

describe('useCandidatesSearch', () => {
  it('debounces search updates via shared polling', async () => {
    const { result } = renderHook(() =>
      useCandidatesSearch({ candidates: mockCandidates }),
    );

    act(() => {
      result.current.setSearch('bob');
    });

    expect(result.current.debouncedQuery).toBe('');

    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(result.current.debouncedQuery).toBe('bob');
    expect(result.current.visibleCandidates).toHaveLength(1);
    expect(result.current.visibleCandidates[0]?.candidateName).toBe(
      'Bob Jones',
    );
  });
});
