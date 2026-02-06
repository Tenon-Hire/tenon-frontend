'use client';
import type { CandidateSession } from '@/features/recruiter/types';
import { CandidatesTableSkeleton } from './CandidatesTableSkeleton';
import { CandidatesEmptyState } from './CandidatesEmptyState';
import { CandidatesTableContent } from './CandidatesTableContent';
import type { RowState } from '../hooks/types';

type Props = {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
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
  onInvite: () => void;
};

export function CandidatesTable(props: Props) {
  const {
    loading,
    error,
    onRetry,
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
    onInvite,
  } = props;

  if (loading) return <CandidatesTableSkeleton />;
  if (error)
    return (
      <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <div>{error}</div>
        <div className="mt-2">
          <button className="text-blue-600 underline" onClick={onRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  if (totalCount === 0) return <CandidatesEmptyState onInvite={onInvite} />;

  return (
    <CandidatesTableContent
      search={search}
      setSearch={setSearch}
      pagedCandidates={pagedCandidates}
      visibleCount={visibleCount}
      totalCount={totalCount}
      page={page}
      pageCount={pageCount}
      setPage={setPage}
      rowStates={rowStates}
      onCopy={onCopy}
      onResend={onResend}
      onCloseManual={onCloseManual}
      cooldownNow={cooldownNow}
      simulationId={simulationId}
    />
  );
}
