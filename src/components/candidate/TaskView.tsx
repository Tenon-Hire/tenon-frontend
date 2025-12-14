"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/common/Button";
import CodeEditor from "@/components/candidate/CodeEditor";

type TaskType = "design" | "code" | "debug" | "handoff" | "documentation" | string;

type Task = {
  id: number;
  dayIndex: number;
  type: TaskType;
  title: string;
  description: string;
};

function isCodeTask(t: Task) {
  return t.type === "code" || t.type === "debug";
}

function isTextTask(t: Task) {
  return t.type === "design" || t.type === "documentation" || t.type === "handoff";
}

function loadDraft(storageKey: string) {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return { text: "", code: "// start here\n" };
    const parsed = JSON.parse(raw) as { text?: string; code?: string };
    return {
      text: parsed.text ?? "",
      code: parsed.code ?? "// start here\n",
    };
  } catch {
    return { text: "", code: "// start here\n" };
  }
}

function TaskViewInner({
  task,
  onSubmit,
  submitting,
  submitError,
}: {
  task: Task;
  submitting: boolean;
  submitError?: string | null;
  onSubmit: (payload: { contentText?: string; codeBlob?: string }) => Promise<void> | void;
}) {
  const storageKey = useMemo(() => `simuhire:candidate_task_draft:${task.id}`, [task.id]);

  const initial = useMemo(() => loadDraft(storageKey), [storageKey]);

  const [text, setText] = useState<string>(() => initial.text);
  const [code, setCode] = useState<string>(() => initial.code);

  const [localError, setLocalError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const codeTask = isCodeTask(task);
  const textTask = isTextTask(task);

  const saveTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (submitting) return;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify({ text, code }));
      } catch {
      }
    }, 350);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [text, code, storageKey, submitting]);

  function saveDraft() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ text, code }));
      setSavedAt(Date.now());
      window.setTimeout(() => setSavedAt(null), 1500);
    } catch {
    }
  }

  async function handleSubmit() {
    if (textTask) {
      const trimmed = text.trim();
      if (!trimmed) {
        setLocalError("Please enter an answer before submitting.");
        return;
      }
      setLocalError(null);

      await onSubmit({ contentText: trimmed });

      try {
        sessionStorage.removeItem(storageKey);
      } catch {}
      return;
    }

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setLocalError("Please write some code before submitting.");
      return;
    }

    setLocalError(null);
    await onSubmit({ codeBlob: code });

    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
  }

  const errorToShow = localError ?? submitError ?? null;

  return (
    <div className="max-w-3xl mx-auto p-6 border rounded-md bg-white">
      <div className="text-sm text-gray-500">
        Day {task.dayIndex} • {String(task.type)}
      </div>
      <div className="text-2xl font-bold mt-1">{task.title}</div>

      <div className="mt-4 whitespace-pre-wrap text-sm text-gray-800">{task.description}</div>

      <div className="mt-6">
        {codeTask ? (
          <div className="space-y-2">
            <div className="text-xs text-gray-500">
              File: <span className="font-medium text-gray-700">index.ts</span>
            </div>
            <CodeEditor value={code} onChange={setCode} language="typescript" />
            <div className="text-xs text-gray-500">
              Draft auto-saves locally while you type (refresh-safe until you submit).
            </div>
          </div>
        ) : (
          <>
            <textarea
              className="w-full min-h-[260px] border rounded-md p-3 text-sm leading-6"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your response here…"
              disabled={submitting}
            />
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>{text.length.toLocaleString()} characters</span>
              {savedAt ? <span>Draft saved</span> : null}
            </div>
          </>
        )}
      </div>

      {errorToShow ? (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {errorToShow}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-2">
        {textTask ? (
          <button
            type="button"
            onClick={saveDraft}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            Save draft
          </button>
        ) : (
          <div />
        )}

        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit & Continue"}
        </Button>
      </div>
    </div>
  );
}

export default function TaskView(props: {
  task: Task;
  submitting: boolean;
  submitError?: string | null;
  onSubmit: (payload: { contentText?: string; codeBlob?: string }) => Promise<void> | void;
}) {
  return <TaskViewInner key={props.task.id} {...props} />;
}
