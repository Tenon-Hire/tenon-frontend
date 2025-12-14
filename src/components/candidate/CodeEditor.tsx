"use client";

import dynamic from "next/dynamic";
import loader from "@monaco-editor/loader";
import { useMemo } from "react";
import type { EditorProps } from "@monaco-editor/react";

let monacoConfigured = false;

function ensureMonacoConfigured() {
  if (monacoConfigured) return;
  if (typeof window === "undefined") return;

  monacoConfigured = true;
  loader.config({
    paths: {
      vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs",
    },
  });
}

const MonacoEditor = dynamic<EditorProps>(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false }
);

export default function CodeEditor({
  value,
  onChange,
  language = "typescript",
}: {
  value: string;
  onChange: (v: string) => void;
  language?: "javascript" | "typescript";
}) {
  ensureMonacoConfigured();

  const options = useMemo<NonNullable<EditorProps["options"]>>(
    () => ({
      minimap: { enabled: false },
      fontSize: 14,
      wordWrap: "on",
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
    }),
    []
  );

  return (
    <div className="border rounded-md overflow-hidden">
      <MonacoEditor
        height="420px"
        language={language}
        value={value}
        onChange={(v: string | undefined) => onChange(v ?? "")}
        options={options}
        loading={<div className="p-3 text-sm text-gray-600">Loading editor…</div>}
      />
    </div>
  );
}
