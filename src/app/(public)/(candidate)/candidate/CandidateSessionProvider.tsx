"use client";

import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";

type SimulationSummary = {
  title: string;
  role: string;
};

type CandidateBootstrap = {
  candidateSessionId: number;
  status: "not_started" | "in_progress" | "completed" | "expired";
  simulation: SimulationSummary;
};

type CandidateSessionState = {
  token: string | null;
  bootstrap: CandidateBootstrap | null;
  started: boolean;
};

type Action =
  | { type: "SET_TOKEN"; token: string }
  | { type: "SET_BOOTSTRAP"; bootstrap: CandidateBootstrap }
  | { type: "SET_STARTED"; started: boolean }
  | { type: "RESET" };

const initialState: CandidateSessionState = {
  token: null,
  bootstrap: null,
  started: false,
};

function reducer(state: CandidateSessionState, action: Action): CandidateSessionState {
  switch (action.type) {
    case "SET_TOKEN":
      return { ...state, token: action.token };
    case "SET_BOOTSTRAP":
      return { ...state, bootstrap: action.bootstrap };
    case "SET_STARTED":
      return { ...state, started: action.started };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

type Ctx = {
  state: CandidateSessionState;
  setToken: (token: string) => void;
  setBootstrap: (b: CandidateBootstrap) => void;
  setStarted: (started: boolean) => void;
  reset: () => void;
};

const CandidateSessionContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "simuhire:candidate_session_v1";

export function CandidateSessionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CandidateSessionState;
      if (parsed?.token) dispatch({ type: "SET_TOKEN", token: parsed.token });
      if (parsed?.bootstrap) dispatch({ type: "SET_BOOTSTRAP", bootstrap: parsed.bootstrap });
      if (typeof parsed?.started === "boolean") dispatch({ type: "SET_STARTED", started: parsed.started });
    } catch {
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
    }
  }, [state]);

  const value = useMemo<Ctx>(
    () => ({
      state,
      setToken: (token) => dispatch({ type: "SET_TOKEN", token }),
      setBootstrap: (bootstrap) => dispatch({ type: "SET_BOOTSTRAP", bootstrap }),
      setStarted: (started) => dispatch({ type: "SET_STARTED", started }),
      reset: () => dispatch({ type: "RESET" }),
    }),
    [state]
  );

  return <CandidateSessionContext.Provider value={value}>{children}</CandidateSessionContext.Provider>;
}

export function useCandidateSession() {
  const ctx = useContext(CandidateSessionContext);
  if (!ctx) throw new Error("useCandidateSession must be used within CandidateSessionProvider");
  return ctx;
}

export type { CandidateBootstrap, SimulationSummary };
