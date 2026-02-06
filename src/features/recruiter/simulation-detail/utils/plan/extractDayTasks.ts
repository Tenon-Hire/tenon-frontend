import { normalizeSimulationPlanDay } from './normalizeDay';
import { parseDayIndex } from '../parsing';
import type { SimulationPlanDay } from './types';

export function extractDayTasks(
  raw: Record<string, unknown>,
): SimulationPlanDay[] {
  const taskSources: unknown[] = [
    raw.tasks,
    raw.taskPlan,
    raw.task_plan,
    raw.dayPlan,
    raw.day_plan,
    raw.days,
    raw.plan,
    raw.simulationPlan,
    raw.simulation_plan,
    raw.generatedPlan,
    raw.generated_plan,
    raw.generatedScenario,
    raw.generated_scenario,
    raw.scenario,
  ];

  let taskContainer: unknown = null;
  for (const source of taskSources) {
    if (Array.isArray(source)) {
      taskContainer = source;
      break;
    }
    if (source && typeof source === 'object') {
      const record = source as Record<string, unknown>;
      const nested = record.tasks ?? record.days ?? record.plan;
      if (Array.isArray(nested) || (nested && typeof nested === 'object')) {
        taskContainer = nested;
        break;
      }
      taskContainer = source;
      break;
    }
  }

  if (!taskContainer) return [];

  if (Array.isArray(taskContainer)) {
    return taskContainer
      .map((entry, index) => normalizeSimulationPlanDay(entry, index + 1))
      .filter((entry): entry is SimulationPlanDay => Boolean(entry));
  }

  if (taskContainer && typeof taskContainer === 'object') {
    return Object.entries(taskContainer as Record<string, unknown>)
      .map(([key, value], index) =>
        normalizeSimulationPlanDay(value, parseDayIndex(key, index + 1)),
      )
      .filter((entry): entry is SimulationPlanDay => Boolean(entry));
  }

  return [];
}
