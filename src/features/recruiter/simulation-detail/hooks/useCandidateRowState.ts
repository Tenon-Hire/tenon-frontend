import { useState } from 'react';
import type { RowState } from './types';

type Updater = (prev: RowState) => RowState;

export function useCandidateRowState(simulationId: string) {
  const [bucket, setBucket] = useState<{
    simId: string;
    data: Record<string, RowState>;
  }>({ simId: simulationId, data: {} });

  const rows = bucket.simId === simulationId ? bucket.data : {};

  const updateRow = (id: string, next: Updater) =>
    setBucket((prev) => {
      const data = prev.simId === simulationId ? prev.data : {};
      return {
        simId: simulationId,
        data: { ...data, [id]: next(data[id] ?? {}) },
      };
    });

  return { rows, updateRow };
}
