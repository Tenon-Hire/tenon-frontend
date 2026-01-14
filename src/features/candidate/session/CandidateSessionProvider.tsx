'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import { BRAND_SLUG } from '@/lib/brand';
import { fetchAuthAccessToken } from '@/lib/auth/accessToken';

type SimulationSummary = {
  title: string;
  role: string;
};

type CandidateBootstrap = {
  candidateSessionId: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'expired';
  simulation: SimulationSummary;
};

type TaskType =
  | 'design'
  | 'code'
  | 'debug'
  | 'handoff'
  | 'documentation'
  | string;

type CandidateTask = {
  id: number;
  dayIndex: number;
  type: TaskType;
  title: string;
  description: string;
};

type TaskState = {
  loading: boolean;
  error: string | null;
  isComplete: boolean;
  completedTaskIds: number[];
  currentTask: CandidateTask | null;
};

type CandidateSessionState = {
  inviteToken: string | null;
  token: string | null;
  candidateSessionId: number | null;
  bootstrap: CandidateBootstrap | null;
  started: boolean;
  taskState: TaskState;
  authStatus: 'idle' | 'loading' | 'ready' | 'unauthenticated' | 'error';
  authError: string | null;
};

type Action =
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

const initialTaskState: TaskState = {
  loading: false,
  error: null,
  isComplete: false,
  completedTaskIds: [],
  currentTask: null,
};

const initialState: CandidateSessionState = {
  inviteToken: null,
  token: null,
  candidateSessionId: null,
  bootstrap: null,
  started: false,
  taskState: initialTaskState,
  authStatus: 'idle',
  authError: null,
};

function reducer(
  state: CandidateSessionState,
  action: Action,
): CandidateSessionState {
  switch (action.type) {
    case 'SET_INVITE_TOKEN':
      if (state.inviteToken === action.inviteToken) return state;
      return { ...state, inviteToken: action.inviteToken };

    case 'SET_TOKEN':
      if (state.token === action.token) return state;
      return { ...state, token: action.token };

    case 'SET_CANDIDATE_SESSION_ID':
      if (state.candidateSessionId === action.candidateSessionId) return state;
      return { ...state, candidateSessionId: action.candidateSessionId };

    case 'SET_BOOTSTRAP':
      if (state.bootstrap === action.bootstrap) return state;
      return { ...state, bootstrap: action.bootstrap };

    case 'SET_STARTED':
      return { ...state, started: action.started };

    case 'TASK_LOADING':
      return {
        ...state,
        taskState: { ...state.taskState, loading: true, error: null },
      };

    case 'TASK_LOADED':
      return {
        ...state,
        taskState: {
          loading: false,
          error: null,
          isComplete: action.payload.isComplete,
          completedTaskIds: action.payload.completedTaskIds,
          currentTask: action.payload.currentTask,
        },
      };

    case 'TASK_ERROR':
      return {
        ...state,
        taskState: { ...state.taskState, loading: false, error: action.error },
      };

    case 'TASK_CLEAR_ERROR':
      return {
        ...state,
        taskState: { ...state.taskState, error: null },
      };

    case 'AUTH_LOADING':
      return { ...state, authStatus: 'loading', authError: null };

    case 'AUTH_READY':
      return { ...state, authStatus: 'ready', authError: null };

    case 'AUTH_UNAUTHENTICATED':
      return {
        ...state,
        authStatus: 'unauthenticated',
        authError: null,
        token: null,
      };

    case 'AUTH_ERROR':
      return { ...state, authStatus: 'error', authError: action.error };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

type Ctx = {
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

const CandidateSessionContext = createContext<Ctx | null>(null);

const STORAGE_KEY = `${BRAND_SLUG}:candidate_session_v1`;

type PersistedState = {
  inviteToken: string | null;
  candidateSessionId: number | null;
  bootstrap: CandidateBootstrap | null;
  started: boolean;
};

export function CandidateSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setInviteToken = useCallback(
    (token: string) =>
      dispatch({ type: 'SET_INVITE_TOKEN', inviteToken: token }),
    [],
  );
  const setToken = useCallback((token: string | null) => {
    dispatch({ type: 'SET_TOKEN', token });
  }, []);
  const setCandidateSessionId = useCallback(
    (candidateSessionId: number | null) =>
      dispatch({ type: 'SET_CANDIDATE_SESSION_ID', candidateSessionId }),
    [],
  );
  const setBootstrap = useCallback(
    (bootstrap: CandidateBootstrap) =>
      dispatch({ type: 'SET_BOOTSTRAP', bootstrap }),
    [],
  );
  const setStarted = useCallback(
    (started: boolean) => dispatch({ type: 'SET_STARTED', started }),
    [],
  );
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const setTaskLoading = useCallback(
    () => dispatch({ type: 'TASK_LOADING' }),
    [],
  );
  const setTaskLoaded = useCallback(
    (payload: {
      isComplete: boolean;
      completedTaskIds: number[];
      currentTask: CandidateTask | null;
    }) => dispatch({ type: 'TASK_LOADED', payload }),
    [],
  );
  const setTaskError = useCallback(
    (error: string) => dispatch({ type: 'TASK_ERROR', error }),
    [],
  );
  const clearTaskError = useCallback(
    () => dispatch({ type: 'TASK_CLEAR_ERROR' }),
    [],
  );

  const loadAccessToken = useCallback(async () => {
    if (state.authStatus === 'loading') return null;
    dispatch({ type: 'AUTH_LOADING' });
    try {
      const token = await fetchAuthAccessToken();
      dispatch({ type: 'SET_TOKEN', token });
      dispatch({ type: 'AUTH_READY' });
      return token;
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        dispatch({ type: 'AUTH_UNAUTHENTICATED' });
        return null;
      }
      dispatch({
        type: 'AUTH_ERROR',
        error: 'Unable to authenticate. Please try again.',
      });
      return null;
    }
  }, [state.authStatus]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (typeof parsed?.inviteToken === 'string' && parsed.inviteToken) {
        dispatch({ type: 'SET_INVITE_TOKEN', inviteToken: parsed.inviteToken });
      }
      if (typeof parsed?.candidateSessionId === 'number') {
        dispatch({
          type: 'SET_CANDIDATE_SESSION_ID',
          candidateSessionId: parsed.candidateSessionId,
        });
      }
      if (parsed?.bootstrap) {
        dispatch({
          type: 'SET_BOOTSTRAP',
          bootstrap: parsed.bootstrap as CandidateBootstrap,
        });
      }
      if (typeof parsed?.started === 'boolean') {
        dispatch({ type: 'SET_STARTED', started: parsed.started });
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (state.token || state.authStatus !== 'idle') return;
    void loadAccessToken();
  }, [loadAccessToken, state.authStatus, state.token]);

  useEffect(() => {
    try {
      const toPersist: PersistedState = {
        inviteToken: state.inviteToken,
        candidateSessionId: state.candidateSessionId,
        bootstrap: state.bootstrap,
        started: state.started,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
    } catch {}
  }, [
    state.bootstrap,
    state.inviteToken,
    state.started,
    state.candidateSessionId,
  ]);

  const value = useMemo<Ctx>(
    () => ({
      state,
      setInviteToken,
      setToken,
      setCandidateSessionId,
      setBootstrap,
      setStarted,
      reset,
      loadAccessToken,

      setTaskLoading,
      setTaskLoaded,
      setTaskError,
      clearTaskError,
    }),
    [
      clearTaskError,
      setInviteToken,
      setCandidateSessionId,
      reset,
      setBootstrap,
      setStarted,
      setTaskError,
      setTaskLoaded,
      setTaskLoading,
      setToken,
      loadAccessToken,
      state,
    ],
  );

  return (
    <CandidateSessionContext.Provider value={value}>
      {children}
    </CandidateSessionContext.Provider>
  );
}

export function useCandidateSession() {
  const ctx = useContext(CandidateSessionContext);
  if (!ctx)
    throw new Error(
      'useCandidateSession must be used within CandidateSessionProvider',
    );
  return ctx;
}

export type { CandidateBootstrap, SimulationSummary, CandidateTask, TaskState };
