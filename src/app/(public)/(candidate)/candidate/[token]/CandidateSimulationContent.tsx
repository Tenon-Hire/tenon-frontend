"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/common/Button";
import TaskView from "@/components/candidate/TaskView";
import TaskProgress from "@/components/candidate/TaskProgress";
import {
  HttpError,
  resolveCandidateInviteToken,
  getCandidateCurrentTask,
  submitCandidateTask,
  type CandidateSessionBootstrapResponse,
  type CandidateCurrentTaskResponse,
} from "@/lib/candidateApi";
import { useCandidateSession } from "../CandidateSessionProvider";

type ViewState = "loading" | "intro" | "error" | "starting" | "running";

function statusFromUnknown(err: unknown): number | undefined {
  if (err instanceof HttpError) return err.status;
  const anyErr = err as { status?: unknown } | undefined;
  return typeof anyErr?.status === "number" ? anyErr.status : undefined;
}

function messageFromUnknown(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  const anyErr = err as { message?: unknown } | undefined;
  return typeof anyErr?.message === "string" ? anyErr.message : undefined;
}

function friendlyBootstrapError(err: unknown): string {
  const status = statusFromUnknown(err);

  if (status === 404) return "That invite link is invalid.";
  if (status === 410) return "That invite link has expired.";
  if (!status || status === 0) return "Network error. Please check your connection and try again.";

  const msg = messageFromUnknown(err);
  if (msg && msg.trim().length > 0) return msg;

  return "Something went wrong loading your simulation.";
}

function friendlyTaskError(err: unknown): string {
  const status = statusFromUnknown(err);

  if (status === 404) return "Session not found. Please reopen your invite link.";
  if (status === 410) return "That invite link has expired.";
  if (!status || status === 0) return "Network error. Please check your connection and try again.";

  const msg = messageFromUnknown(err);
  if (msg && msg.trim().length > 0) return msg;

  return "Something went wrong loading your current task.";
}

function friendlySubmitError(err: unknown): string {
  const status = statusFromUnknown(err);

  if (status === 400) return "Task out of order.";
  if (status === 409) return "Task already submitted.";
  if (status === 404) return "Session mismatch. Please reopen your invite link.";
  if (!status || status === 0) return "Network error. Please check your connection and try again.";

  const msg = messageFromUnknown(err);
  if (msg && msg.trim().length > 0) return msg;

  return "Something went wrong submitting your task.";
}

function normalizeCompletedTaskIds(dto: CandidateCurrentTaskResponse): number[] {
  const root = dto.completedTaskIds;
  const nested = dto.progress?.completedTaskIds;

  if (Array.isArray(root)) return root;
  if (Array.isArray(nested)) return nested;
  return [];
}

export default function CandidateSimulationContent({ token }: { token: string }) {
  const {
    state,
    setToken,
    setBootstrap,
    setStarted,
    setTaskLoading,
    setTaskLoaded,
    setTaskError,
    clearTaskError,
  } = useCandidateSession();

  const [view, setView] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const bootstrap = state.bootstrap as CandidateSessionBootstrapResponse | null;

  const title = useMemo(() => bootstrap?.simulation.title ?? "", [bootstrap]);
  const role = useMemo(() => bootstrap?.simulation.role ?? "", [bootstrap]);

  const candidateSessionId = bootstrap?.candidateSessionId ?? null;

  const bootstrapInFlightRef = useRef(false);
  const bootstrapTokenRef = useRef<string | null>(null);

  const fetchTaskInFlightRef = useRef(false);

  const fetchCurrentTask = useCallback(async () => {
    if (!state.token || !candidateSessionId) return;
    if (fetchTaskInFlightRef.current) return;

    fetchTaskInFlightRef.current = true;

    clearTaskError();
    setTaskLoading();

    try {
      const dto = await getCandidateCurrentTask(candidateSessionId, state.token);

      const completedTaskIds = normalizeCompletedTaskIds(dto);
      const currentTask = dto.currentTask
        ? {
            id: dto.currentTask.id,
            dayIndex: dto.currentTask.dayIndex,
            type: dto.currentTask.type,
            title: dto.currentTask.title,
            description: dto.currentTask.description,
          }
        : null;

      setTaskLoaded({
        isComplete: Boolean(dto.isComplete),
        completedTaskIds,
        currentTask,
      });

      setView("running");
    } catch (err) {
      setTaskError(friendlyTaskError(err));
      setView("running");
    } finally {
      fetchTaskInFlightRef.current = false;
    }
  }, [
    candidateSessionId,
    clearTaskError,
    setTaskError,
    setTaskLoaded,
    setTaskLoading,
    state.token,
  ]);

  const loadBootstrap = useCallback(async () => {
    if (bootstrapTokenRef.current === token && bootstrapInFlightRef.current) return;

    bootstrapInFlightRef.current = true;
    bootstrapTokenRef.current = token;
    setView("loading");
    setErrorMessage(null);

    try {
      setToken(token);

      const data = await resolveCandidateInviteToken(token);
      setBootstrap(data);

      setView("intro");
    } catch (err) {
      setErrorMessage(friendlyBootstrapError(err));
      setView("error");
    } finally {
      bootstrapInFlightRef.current = false;
    }
  }, [setBootstrap, setToken, token]);

  useEffect(() => {
    if (state.token === token && state.bootstrap) {
      setView(state.started ? "starting" : "intro");
      return;
    }
    void loadBootstrap();
  }, [loadBootstrap, state.bootstrap, state.started, state.token, token]);

  useEffect(() => {
    if (!state.started) return;
    if (!state.bootstrap) return;
    if (view === "error") return;
    if (view === "running") return;
    setView("starting");
  }, [state.started, state.bootstrap, view]);

  useEffect(() => {
    if (view !== "starting") return;
    void fetchCurrentTask();
  }, [fetchCurrentTask, view]);

  const completedCount = state.taskState.completedTaskIds.length;

  const currentDayIndex = useMemo(() => {
    if (state.taskState.isComplete) return 5;
    if (state.taskState.currentTask?.dayIndex) return state.taskState.currentTask.dayIndex;
    return Math.min(completedCount + 1, 5);
  }, [completedCount, state.taskState.currentTask, state.taskState.isComplete]);

  const handleSubmit = useCallback(
    async (payload: { contentText?: string; codeBlob?: string }) => {
      if (!state.token || !candidateSessionId || !state.taskState.currentTask) return;

      const type = String(state.taskState.currentTask.type);
      const isTextTask = type === "design" || type === "documentation" || type === "handoff";
      const isCodeTask = type === "code" || type === "debug";

      if (isTextTask) {
        const trimmed = (payload.contentText ?? "").trim();
        if (!trimmed) {
          setTaskError("Please enter an answer before submitting.");
          return;
        }
      }

      if (isCodeTask) {
        const trimmedCode = (payload.codeBlob ?? "").trim();
        if (!trimmedCode) {
          setTaskError("Please write some code before submitting.");
          return;
        }
      }

      setSubmitting(true);
      clearTaskError();

      try {
        await submitCandidateTask({
          taskId: state.taskState.currentTask.id,
          token: state.token,
          candidateSessionId,
          contentText: payload.contentText,
          codeBlob: payload.codeBlob,
        });

        await fetchCurrentTask();
      } catch (err) {
        setTaskError(friendlySubmitError(err));
      } finally {
        setSubmitting(false);
      }
    },
    [
      candidateSessionId,
      clearTaskError,
      fetchCurrentTask,
      setTaskError,
      state.taskState.currentTask,
      state.token,
    ]
  );

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
          <Button onClick={loadBootstrap}>Retry</Button>
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
          <p>You’ll complete one task per day (design → code → debug → handoff → documentation).</p>
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

  if (view === "starting") {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-lg font-semibold">Starting…</div>
        <div className="text-sm text-gray-600 mt-2">Loading your current task.</div>
      </div>
    );
  }

  if (state.taskState.isComplete) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-2xl font-bold">Simulation complete 🎉</div>
        <div className="text-sm text-gray-700 mt-3">
          You’ve submitted all 5 days. You can close this tab now.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xl font-bold">{title}</div>
          <div className="text-sm text-gray-600">Role: {role}</div>
        </div>
        {state.taskState.loading ? <div className="text-sm text-gray-500">Refreshing…</div> : null}
      </div>

      <TaskProgress completedCount={completedCount} currentDayIndex={currentDayIndex} />

      {state.taskState.error ? (
        <div className="border rounded-md p-3 bg-red-50 text-sm text-red-800">
          {state.taskState.error}{" "}
          <button className="underline ml-2" onClick={() => void fetchCurrentTask()}>
            Retry
          </button>
        </div>
      ) : null}

      {state.taskState.currentTask ? (
        <TaskView
          task={state.taskState.currentTask}
          submitting={submitting}
          submitError={state.taskState.error}
          onSubmit={handleSubmit}
        />
      ) : (
        <div className="border rounded-md p-4 text-sm text-gray-700">No current task available.</div>
      )}
    </div>
  );
}
