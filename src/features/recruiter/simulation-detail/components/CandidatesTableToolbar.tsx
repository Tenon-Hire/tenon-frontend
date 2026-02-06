'use client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { nextPage, prevPage } from '../hooks/candidatesPagination';

type Props = {
  search: string;
  setSearch: (value: string) => void;
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
  pageSummary: string;
};

export function CandidatesTableToolbar({
  search,
  setSearch,
  page,
  pageCount,
  setPage,
  pageSummary,
}: Props) {
  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-xs">
          <label
            className="text-xs font-medium uppercase tracking-wide text-gray-500"
            htmlFor="candidate-search"
          >
            Search candidates
          </label>
          <Input
            id="candidate-search"
            name="candidate-search"
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mt-1"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>{pageSummary}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(prevPage(page))}
              disabled={page <= 1}
            >
              Prev
            </Button>
            <span className="min-w-[70px] text-center text-gray-600">
              Page {page} / {pageCount}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(nextPage(page, pageCount))}
              disabled={page >= pageCount}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
