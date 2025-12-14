"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/common/Button";
import { apiClient, ApiErrorShape } from "@/lib/apiClient";
import { useCandidateSession } from "../CandidateSessionProvider";

type ViewState = "loading" | "intro" | "error" | "starting";

type BootstrapResponse = {
  candidateSessionId: number;
  status: "not_started" | "in_progress" | "completed" | "expired";
  simulation: {
    title: string;
    role: string;
  };
};

function friendlyBootstrapError(err: unknown): string {
  const e = err as ApiErrorShape | undefined;
  const status = typeof e?.status === "number" ? e.status : undefined;

  if (status === 404) return "That invite link is invalid.";
  if (status === 410) return "That invite link has expired.";
  if (!status) return "Network error. Please check your connection and try again.";

  if (typeof e?.message === "string" && e.message.trim().length > 0) return e.message;

  return "Something went wrong loading your simulation.";
}

export default function CandidateSimulationContent({ token }: { token: string }) {
  const { state, setToken, setBootstrap, setStarted } = useCandidateSession();

  const [view, setView] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const bootstrap = state.bootstrap as BootstrapResponse | null;

  const load = useCallback(async () => {
    setView("loading");
    setErrorMessage(null);

    try {
      setToken(token);

      const data = await apiClient.get<BootstrapResponse>(
        `/candidate/session/${encodeURIComponent(token)}`,
        { skipAuth: true }
      );

      setBootstrap(data);
      setView("intro");
    } catch (err) {
      setErrorMessage(friendlyBootstrapError(err));
      setView("error");
    }
  }, [setBootstrap, setToken, token]);

  useEffect(() => {
    if (state.token === token && state.bootstrap) {
      setView(state.started ? "starting" : "intro");
      return;
    }

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const title = useMemo(() => bootstrap?.simulation.title ?? "", [bootstrap]);
  const role = useMemo(() => bootstrap?.simulation.role ?? "", [bootstrap]);

  if (view === "loading") {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-lg font-semibold">Loading simulation…</div>
        <div className="text-sm text-gray-500 mt-2">Validating invite link.</div>
      </div>
    );
  }

  if (view === "error") {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-lg font-semibold">Unable to load simulation</div>
        <div className="text-sm text-gray-600 mt-2">{errorMessage}</div>
        <div className="mt-4">
          <Button onClick={load}>Retry</Button>
        </div>
      </div>
    );
  }

  if (view === "intro") {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-2xl font-bold">{title}</div>
        <div className="text-sm text-gray-600 mt-1">Role: {role}</div>

        <div className="mt-6 space-y-2 text-sm text-gray-700">
          <p>You’re about to start a 5-day asynchronous work simulation.</p>
          <p>
            You’ll complete one task per day (design → code → debug → handoff → documentation).
          </p>
          <p>When you’re ready, click Start.</p>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            onClick={() => {
              setStarted(true);
              setView("starting");
            }}
          >
            Start simulation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="text-lg font-semibold">Starting…</div>
      <div className="text-sm text-gray-600 mt-2">Loading your first task.</div>
    </div>
  );
}
