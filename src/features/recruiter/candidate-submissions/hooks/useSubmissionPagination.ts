import { useMemo, useState } from 'react';
import type { SubmissionListItem } from '../types';

export function useSubmissionPagination(
  items: SubmissionListItem[],
  pageSize: number,
) {
  const [page, setPage] = useState(1);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / pageSize)),
    [items.length, pageSize],
  );
  const safePage = Math.min(page, totalPages);

  const pagedItems = useMemo(
    () =>
      items.slice(
        (safePage - 1) * pageSize,
        (safePage - 1) * pageSize + pageSize,
      ),
    [items, pageSize, safePage],
  );

  return { page: safePage, setPage, totalPages, pagedItems };
}
