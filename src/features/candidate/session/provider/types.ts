import type { Dispatch, Reducer } from 'react';

export type SimulationSummary = { title: string; role: string };

export type CandidateBootstrap = {
  candidateSessionId: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'expired';
  simulation: SimulationSummary;
};

export type TaskType =
  | 'design'
  | 'code'
  | 'debug'
  | 'handoff'
  | 'documentation'
  | string;

export type CandidateTask = {
  id: number;
  dayIndex: number;
  type: TaskType;
  title: string;
  description: string;
};

export type TaskState = {
  loading: boolean;
  error: string | null;
  isComplete: boolean;
  completedTaskIds: number[];
  currentTask: CandidateTask | null;
};

export type CandidateSessionState = {
  inviteToken: string | null;
  token: string | null;
  candidateSessionId: number | null;
  bootstrap: CandidateBootstrap | null;
  started: boolean;
  taskState: TaskState;
  authStatus: 'idle' | 'loading' | 'ready' | 'unauthenticated' | 'error';
  authError: string | null;
};

export type Action =
  | { type: 'SET_INVITE_TOKEN'; inviteToken: string }
  | { type: 'SET_TOKEN'; token: string | null }
  | { type: 'SET_CANDIDATE_SESSION_ID'; candidateSessionId: number | null }
  | { type: 'SET_BOOTSTRAP'; bootstrap: CandidateBootstrap }
  | { type: 'SET_STARTED'; started: boolean }
  | { type: 'RESET' }
  | { type: 'TASK_LOADING' }
  | {
      type: 'TASK_LOADED';
      payload: {
        isComplete: boolean;
        completedTaskIds: number[];
        currentTask: CandidateTask | null;
      };
    }
  | { type: 'TASK_ERROR'; error: string }
  | { type: 'TASK_CLEAR_ERROR' }
  | { type: 'AUTH_LOADING' }
  | { type: 'AUTH_READY' }
  | { type: 'AUTH_UNAUTHENTICATED' }
  | { type: 'AUTH_ERROR'; error: string };

export type Ctx = {
  state: CandidateSessionState;
  setInviteToken: (token: string) => void;
  setToken: (token: string | null) => void;
  setCandidateSessionId: (id: number | null) => void;
  setBootstrap: (b: CandidateBootstrap) => void;
  setStarted: (started: boolean) => void;
  reset: () => void;
  loadAccessToken: () => Promise<string | null>;
  setTaskLoading: () => void;
  setTaskLoaded: (p: {
    isComplete: boolean;
    completedTaskIds: number[];
    currentTask: CandidateTask | null;
  }) => void;
  setTaskError: (error: string) => void;
  clearTaskError: () => void;
};

export type PersistedState = {
  inviteToken: string | null;
  candidateSessionId: number | null;
  bootstrap: CandidateBootstrap | null;
  started: boolean;
};

export type ReducerPair = {
  state: CandidateSessionState;
  dispatch: Dispatch<Action>;
  reducer: Reducer<CandidateSessionState, Action>;
};
