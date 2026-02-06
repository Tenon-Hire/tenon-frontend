import {
  formatCandidatesPageSummary,
  nextPage,
  prevPage,
} from '@/features/recruiter/simulation-detail/hooks/candidatesPagination';

describe('candidatesPagination helpers', () => {
  it('formats page summary', () => {
    expect(formatCandidatesPageSummary(10, 20, 30)).toBe(
      'Showing 10 of 20 (total 30)',
    );
  });

  it('guards previous page at 1', () => {
    expect(prevPage(1)).toBe(1);
    expect(prevPage(3)).toBe(2);
  });

  it('caps next page at max', () => {
    expect(nextPage(1, 5)).toBe(2);
    expect(nextPage(5, 5)).toBe(5);
  });
});
