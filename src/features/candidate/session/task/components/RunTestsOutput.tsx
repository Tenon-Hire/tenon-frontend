'use client';

import { useState } from 'react';

type Props = { label: 'Stdout' | 'Stderr'; content: string | null };

const MAX_CHARS = 8000;

export function RunTestsOutput({ label, content }: Props) {
  const [expanded, setExpanded] = useState(false);
  const text = content?.trim() ?? '';
  if (!text) {
    return (
      <div className="rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-600">
        {label}: No output captured.
      </div>
    );
  }

  const needsTruncate = text.length > MAX_CHARS;
  const display =
    !needsTruncate || expanded ? text : `${text.slice(0, MAX_CHARS)}…`;

  const canCopy =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.clipboard) &&
    typeof navigator.clipboard.writeText === 'function';

  const handleCopy = async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-800">
      <div className="flex items-center justify-between text-[11px] text-gray-600">
        <span>{label}</span>
        <div className="flex items-center gap-2">
          {canCopy ? (
            <button
              className="text-blue-600 hover:underline"
              type="button"
              onClick={handleCopy}
            >
              Copy
            </button>
          ) : null}
          {needsTruncate ? (
            <button
              className="text-blue-600 hover:underline"
              type="button"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Collapse' : `Show full ${label.toLowerCase()}`}
            </button>
          ) : null}
        </div>
      </div>
      <pre className="mt-1 whitespace-pre-wrap break-words font-mono">
        {display}
      </pre>
    </div>
  );
}
