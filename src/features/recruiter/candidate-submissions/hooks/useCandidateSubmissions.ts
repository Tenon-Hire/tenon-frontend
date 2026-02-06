import { useCandidateSubmissionsData } from './useCandidateSubmissionsData';
import { useSubmissionPagination } from './useSubmissionPagination';
import { useArtifactsForPage } from './useArtifactsForPage';

const PAGE_SIZE = 8;

export function useCandidateSubmissions(
  simulationId: string,
  candidateSessionId: string,
) {
  const { state, actions, setShowAll } = useCandidateSubmissionsData(
    simulationId,
    candidateSessionId,
    PAGE_SIZE,
  );
  const pagination = useSubmissionPagination(state.items, PAGE_SIZE);

  useArtifactsForPage({
    showAll: state.showAll,
    pagedItems: pagination.pagedItems,
    artifacts: state.artifacts,
    setArtifacts: actions.setArtifacts,
  });

  return {
    state: {
      ...state,
      page: pagination.page,
      totalPages: pagination.totalPages,
    },
    actions: {
      reload: actions.reload,
      setPage: (page: number) => {
        setShowAll(true);
        pagination.setPage(page);
      },
      toggleShowAll: () => {
        actions.toggleShowAll();
        if (!state.showAll) pagination.setPage(1);
      },
    },
    pagedItems: pagination.pagedItems,
    pageSize: PAGE_SIZE,
  };
}
