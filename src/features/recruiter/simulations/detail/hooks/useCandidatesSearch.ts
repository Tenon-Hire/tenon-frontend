import { useMemo, useState } from 'react';
import { useDebouncedValue } from '@/shared/polling';
import type { CandidateSession } from '@/features/recruiter/types';
import { deriveStatus, toTimestamp } from '../utils/formatters';

type Params = {
  candidates: CandidateSession[];
  pageSize?: number;
};

const STATUS_RANK: Record<string, number> = {
  completed: 0,
  in_progress: 1,
  not_started: 2,
};

const normalizeQuery = (value: string) => value.trim().toLowerCase();
const matchesQuery = (candidate: CandidateSession, query: string) => {
  if (!query) return true;
  const name = candidate.candidateName?.toLowerCase() ?? '';
  const email = candidate.inviteEmail?.toLowerCase() ?? '';
  return name.includes(query) || email.includes(query);
};

const compareCandidates = (a: CandidateSession, b: CandidateSession) => {
  const aStatus = deriveStatus(a);
  const bStatus = deriveStatus(b);
  const statusDelta = STATUS_RANK[aStatus] - STATUS_RANK[bStatus];
  if (statusDelta !== 0) return statusDelta;

  if (aStatus === 'completed') {
    const delta = toTimestamp(b.completedAt) - toTimestamp(a.completedAt);
    if (delta !== 0) return delta;
  }
  if (aStatus === 'in_progress') {
    const delta = toTimestamp(b.startedAt) - toTimestamp(a.startedAt);
    if (delta !== 0) return delta;
  }

  const aEmail = (a.inviteEmail ?? '').toLowerCase();
  const bEmail = (b.inviteEmail ?? '').toLowerCase();
  return aEmail.localeCompare(bEmail);
};

export function useCandidatesSearch({ candidates, pageSize = 25 }: Params) {
  const [search, setSearchState] = useState('');
  const [page, setPageState] = useState(1);
  const debouncedQuery = useDebouncedValue({ value: search, delayMs: 180 });

  const visible = useMemo(() => {
    const query = normalizeQuery(debouncedQuery);
    const filtered = candidates.filter((candidate) =>
      matchesQuery(candidate, query),
    );
    return [...filtered].sort(compareCandidates);
  }, [candidates, debouncedQuery]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(visible.length / pageSize)),
    [pageSize, visible.length],
  );
  const currentPage = useMemo(
    () => Math.min(page, pageCount),
    [page, pageCount],
  );
  const paged = useMemo(
    () =>
      visible.slice(
        (currentPage - 1) * pageSize,
        (currentPage - 1) * pageSize + pageSize,
      ),
    [currentPage, pageSize, visible],
  );

  const setSearch = (value: string) => {
    setSearchState(value);
    setPageState(1);
  };
  const setPage = (value: number) =>
    setPageState(Math.max(1, Math.floor(value)));

  return {
    search,
    setSearch,
    debouncedQuery,
    page: currentPage,
    pageCount,
    setPage,
    pagedCandidates: paged,
    visibleCandidates: visible,
    pageSize,
  };
}
