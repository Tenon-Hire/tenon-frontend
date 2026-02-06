export type SimulationPlanDay = {
  dayIndex: number;
  title: string;
  type: string | null;
  prompt: string | null;
  rubricItems: string[];
  rubricText: string | null;
  repoUrl: string | null;
  repoName: string | null;
  codespaceUrl: string | null;
  provisioned: boolean | null;
};

export type SimulationPlan = {
  title: string | null;
  templateKey: string | null;
  role: string | null;
  techStack: string | null;
  focus: string | null;
  scenario: string | null;
  days: SimulationPlanDay[];
};
