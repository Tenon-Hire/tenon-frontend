'use client';
import type { CandidateSession } from '@/types/recruiter';
import type { RowState } from '../hooks/types';
import { useCandidatesTableView } from '../hooks/useCandidatesTableView';
import { CandidatesTableToolbar } from './CandidatesTableToolbar';
import { CandidatesTableBody } from './CandidatesTableBody';
import { CandidatesTableEmpty } from './CandidatesTableEmpty';

type Props = {
  search: string;
  setSearch: (value: string) => void;
  pagedCandidates: CandidateSession[];
  visibleCount: number;
  totalCount: number;
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
  rowStates: Record<string, RowState>;
  onCopy: (candidate: CandidateSession) => void;
  onResend: (candidate: CandidateSession) => void;
  onCloseManual: (id: number) => void;
  cooldownNow: number;
  simulationId: string;
};

export function CandidatesTableContent({
  search,
  setSearch,
  pagedCandidates,
  visibleCount,
  totalCount,
  page,
  pageCount,
  setPage,
  rowStates,
  onCopy,
  onResend,
  onCloseManual,
  cooldownNow,
  simulationId,
}: Props) {
  const { rowStateFor, pageSummary } = useCandidatesTableView({
    rowStates,
    pagedCandidates,
    visibleCount,
    totalCount,
  });

  return (
    <div className="overflow-hidden rounded border border-gray-200 bg-white">
      <CandidatesTableToolbar
        search={search}
        setSearch={setSearch}
        page={page}
        pageCount={pageCount}
        setPage={setPage}
        pageSummary={pageSummary}
      />
      {visibleCount === 0 ? (
        <CandidatesTableEmpty />
      ) : (
        <CandidatesTableBody
          pagedCandidates={pagedCandidates}
          rowStateFor={rowStateFor}
          cooldownNow={cooldownNow}
          simulationId={simulationId}
          onCopy={onCopy}
          onResend={onResend}
          onCloseManual={onCloseManual}
        />
      )}
    </div>
  );
}
