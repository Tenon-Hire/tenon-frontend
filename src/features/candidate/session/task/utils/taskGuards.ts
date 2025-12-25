type TaskType =
  | 'design'
  | 'code'
  | 'debug'
  | 'handoff'
  | 'documentation'
  | string;

export function isCodeTask(type: TaskType) {
  return type === 'code' || type === 'debug';
}

export function isTextTask(type: TaskType) {
  return type === 'design' || type === 'documentation' || type === 'handoff';
}

export function isSubmitResponse(x: unknown): x is {
  submissionId: number;
  taskId: number;
  candidateSessionId: number;
  submittedAt: string;
  progress: { completed: number; total: number };
  isComplete: boolean;
} {
  if (typeof x !== 'object' || x === null) return false;
  const rec = x as Record<string, unknown>;
  const progress = rec['progress'];
  if (typeof rec['submissionId'] !== 'number') return false;
  if (typeof rec['taskId'] !== 'number') return false;
  if (typeof rec['candidateSessionId'] !== 'number') return false;
  if (typeof rec['submittedAt'] !== 'string') return false;
  if (typeof rec['isComplete'] !== 'boolean') return false;
  if (typeof progress !== 'object' || progress === null) return false;
  const p = progress as Record<string, unknown>;
  return typeof p['completed'] === 'number' && typeof p['total'] === 'number';
}
