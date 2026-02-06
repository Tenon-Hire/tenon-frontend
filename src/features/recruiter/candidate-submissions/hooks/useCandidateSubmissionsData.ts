import { useCandidateSubmissionsLoader } from './useCandidateSubmissionsLoader';
import { useCandidateSubmissionsState } from './useCandidateSubmissionsState';

export function useCandidateSubmissionsData(
  simulationId: string,
  candidateSessionId: string,
  pageSize: number,
) {
  const { state, setters } = useCandidateSubmissionsState();
  const loader = useCandidateSubmissionsLoader({
    simulationId,
    candidateSessionId,
    pageSize,
    showAll: state.showAll,
    setters,
  });

  return {
    state,
    actions: {
      reload: () => loader.reload({ skipCache: true }),
      toggleShowAll: loader.toggleShowAll,
      setArtifacts: setters.setArtifacts,
    },
    setShowAll: setters.setShowAll,
  };
}
