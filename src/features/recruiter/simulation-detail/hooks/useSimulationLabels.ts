import { useMemo } from 'react';
import type { SimulationPlan } from '../utils/plan';

type PlanDay = {
  dayIndex: number;
  task: SimulationPlan['days'][number] | null;
};

export function useSimulationLabels(
  plan: SimulationPlan | null,
  simulationId: string,
) {
  const planDays = useMemo<PlanDay[]>(() => {
    if (!plan) {
      return [1, 2, 3, 4, 5].map((dayIndex) => ({ dayIndex, task: null }));
    }
    const byIndex = new Map(plan.days.map((day) => [day.dayIndex, day]));
    return [1, 2, 3, 4, 5].map((dayIndex) => ({
      dayIndex,
      task: byIndex.get(dayIndex) ?? null,
    }));
  }, [plan]);

  const templateKeyLabel = plan?.templateKey?.trim() || 'N/A';
  const titleLabel = plan?.title?.trim() || `Simulation ${simulationId}`;
  const roleLabel = plan?.role?.trim() || 'N/A';
  const stackLabel = plan?.techStack?.trim() || 'N/A';
  const focusLabel = plan?.focus?.trim() || 'N/A';
  const scenarioLabel = plan?.scenario?.trim() || null;

  return {
    planDays,
    templateKeyLabel,
    titleLabel,
    roleLabel,
    stackLabel,
    focusLabel,
    scenarioLabel,
  };
}
