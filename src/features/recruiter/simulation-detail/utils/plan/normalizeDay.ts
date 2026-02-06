import { toBooleanOrNull, toStringOrNull, parseDayIndex } from '../parsing';
import { normalizeRubric } from './normalizeRubric';
import type { SimulationPlanDay } from './types';

export function normalizeSimulationPlanDay(
  raw: unknown,
  fallbackDayIndex?: number | null,
): SimulationPlanDay | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const dayIndex = parseDayIndex(
    rec.dayIndex ??
      rec.day_index ??
      rec.dayNumber ??
      rec.day_number ??
      rec.day ??
      rec.order ??
      rec.sequence,
    fallbackDayIndex ?? null,
  );

  const title =
    toStringOrNull(rec.title ?? rec.name ?? rec.taskTitle ?? rec.summary) ??
    (dayIndex ? `Day ${dayIndex}` : 'Task');
  const prompt = toStringOrNull(
    rec.prompt ??
      rec.description ??
      rec.instructions ??
      rec.task ??
      rec.taskPrompt ??
      rec.problem,
  );
  const { rubricItems, rubricText } = normalizeRubric(
    rec.rubric ??
      rec.rubrics ??
      rec.criteria ??
      rec.evaluation ??
      rec.grading ??
      rec.assessment,
  );

  const repoUrl = toStringOrNull(
    rec.repoUrl ??
      rec.repo_url ??
      rec.repoHtmlUrl ??
      rec.repo_html_url ??
      rec.repositoryUrl ??
      rec.repository_url ??
      rec.repoLink ??
      rec.repo_link,
  );
  const repoName = toStringOrNull(
    rec.repoFullName ??
      rec.repo_full_name ??
      rec.repositoryFullName ??
      rec.repository_full_name ??
      rec.repoName ??
      rec.repo_name,
  );
  const codespaceUrl = toStringOrNull(
    rec.codespaceUrl ??
      rec.codespace_url ??
      rec.workspaceUrl ??
      rec.workspace_url,
  );

  const provisioned = toBooleanOrNull(
    rec.repoProvisioned ??
      rec.repo_provisioned ??
      rec.isProvisioned ??
      rec.is_provisioned ??
      rec.preProvisioned ??
      rec.pre_provisioned ??
      rec.workspaceReady ??
      rec.workspace_ready,
  );

  return {
    dayIndex,
    title,
    type: toStringOrNull(rec.type ?? rec.taskType ?? rec.task_type ?? rec.kind),
    prompt,
    rubricItems,
    rubricText,
    repoUrl,
    repoName,
    codespaceUrl,
    provisioned,
  };
}
