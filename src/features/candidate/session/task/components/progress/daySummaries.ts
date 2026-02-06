export type DayStatus = 'completed' | 'current' | 'locked';

export const DAY_SUMMARIES = [
  {
    title: 'Kickoff brief',
    detail: 'Understand the prompt and outline your approach.',
    hint: 'Submit your written response.',
  },
  {
    title: 'Build in GitHub',
    detail: 'Implement the feature in your workspace.',
    hint: 'Workspace + tests.',
  },
  {
    title: 'Debug + iterate',
    detail: 'Fix issues and ship a clean run.',
    hint: 'Workspace + tests.',
  },
  {
    title: 'Record walkthrough',
    detail: 'Share a short handoff recording.',
    hint: 'Recording link.',
  },
  {
    title: 'Write documentation',
    detail: 'Summarize decisions and next steps.',
    hint: 'Documentation link.',
  },
];
