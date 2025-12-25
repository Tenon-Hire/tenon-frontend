export type TaskType =
  | 'design'
  | 'code'
  | 'debug'
  | 'handoff'
  | 'documentation'
  | string;

export type Task = {
  id: number;
  dayIndex: number;
  type: TaskType;
  title: string;
  description: string;
};

export type SubmitPayload = { contentText?: string; codeBlob?: string };

export type SubmitResponse = {
  submissionId: number;
  taskId: number;
  candidateSessionId: number;
  submittedAt: string;
  progress: { completed: number; total: number };
  isComplete: boolean;
};
