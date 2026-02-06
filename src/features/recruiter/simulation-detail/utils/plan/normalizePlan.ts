import { toStringOrCsv, toStringOrNull } from '../parsing';
import { extractDayTasks } from './extractDayTasks';
import type { SimulationPlan } from './types';

export function normalizeSimulationPlan(raw: unknown): SimulationPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const scenarioRaw =
    rec.scenario ??
    rec.scenarioSummary ??
    rec.scenario_summary ??
    rec.overview ??
    rec.summary ??
    rec.simulationScenario ??
    rec.simulation_scenario;

  const scenario =
    toStringOrNull(scenarioRaw) ??
    (scenarioRaw && typeof scenarioRaw === 'object'
      ? toStringOrNull(
          (scenarioRaw as Record<string, unknown>).summary ??
            (scenarioRaw as Record<string, unknown>).overview ??
            (scenarioRaw as Record<string, unknown>).description,
        )
      : null);

  return {
    title: toStringOrNull(rec.title ?? rec.simulation_title ?? rec.name),
    templateKey: toStringOrNull(rec.templateKey ?? rec.template_key),
    role: toStringOrCsv(rec.role ?? rec.role_name ?? rec.roleName),
    techStack: toStringOrCsv(
      rec.techStack ?? rec.tech_stack ?? rec.stack ?? rec.stack_name,
    ),
    focus: toStringOrCsv(rec.focus ?? rec.focus_area ?? rec.focusArea),
    scenario,
    days: extractDayTasks(rec).sort((a, b) => a.dayIndex - b.dayIndex),
  };
}
