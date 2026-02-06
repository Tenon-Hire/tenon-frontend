import { useCallback, useMemo } from 'react';
import type { CandidateSession } from '@/types/recruiter';
import type { RowState } from './types';
import { formatCandidatesPageSummary } from './candidatesPagination';

type Params = {
  rowStates: Record<string, RowState>;
  pagedCandidates: CandidateSession[];
  visibleCount: number;
  totalCount: number;
};

export function useCandidatesTableView({
  rowStates,
  pagedCandidates,
  visibleCount,
  totalCount,
}: Params) {
  const rowStateFor = useCallback(
    (id: number) => rowStates[String(id)] ?? {},
    [rowStates],
  );

  const pageSummary = useMemo(
    () =>
      formatCandidatesPageSummary(
        pagedCandidates.length,
        visibleCount,
        totalCount,
      ),
    [pagedCandidates.length, totalCount, visibleCount],
  );

  return { rowStateFor, pageSummary };
}
