export const formatCandidatesPageSummary = (
  pagedCount: number,
  visibleCount: number,
  totalCount: number,
) => `Showing ${pagedCount} of ${visibleCount} (total ${totalCount})`;

export const prevPage = (page: number) => Math.max(1, page - 1);

export const nextPage = (page: number, pageCount: number) =>
  Math.min(pageCount, page + 1);
