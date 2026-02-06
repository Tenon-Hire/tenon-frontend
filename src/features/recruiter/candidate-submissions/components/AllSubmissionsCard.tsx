import { SubmissionsTable } from './SubmissionsTable';
import type { SubmissionActions, SubmissionState } from './types';
import type { SubmissionListItem } from '../types';

type Props = {
  state: SubmissionState;
  actions: SubmissionActions;
  pagedItems: SubmissionListItem[];
  pageSize: number;
};

export function AllSubmissionsCard({
  state,
  actions,
  pagedItems,
  pageSize,
}: Props) {
  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-900">
          All submissions
        </div>
        <button
          className="text-sm text-blue-600 underline"
          onClick={actions.toggleShowAll}
        >
          {state.showAll ? 'Hide list' : 'Show all'}
        </button>
      </div>
      {state.showAll ? (
        <div className="mt-3">
          <SubmissionsTable
            items={pagedItems}
            totalCount={state.items.length}
            artifacts={state.artifacts}
            page={state.page}
            totalPages={state.totalPages}
            pageSize={pageSize}
            onPrev={() => actions.setPage(Math.max(1, state.page - 1))}
            onNext={() =>
              actions.setPage(Math.min(state.totalPages, state.page + 1))
            }
          />
        </div>
      ) : (
        <div className="mt-2 text-sm text-gray-600">
          Submission list collapsed for brevity.
        </div>
      )}
    </div>
  );
}
