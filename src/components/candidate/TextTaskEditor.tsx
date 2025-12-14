'use client';

import * as React from 'react';
import Button from '../common/Button';

function draftKey(taskId: number) {
  return `simuhire:candidate:draft:text:${taskId}`;
}

type Props = {
  taskId: number;
  disabled?: boolean;
  submitError?: string | null;
  onSubmit: (contentText: string) => Promise<void>;
};

export default function TextTaskEditor({ taskId, disabled, submitError, onSubmit }: Props) {
  const [value, setValue] = React.useState('');
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    const existing = sessionStorage.getItem(draftKey(taskId));
    if (existing != null) setValue(existing);
  }, [taskId]);

  const charCount = value.length;

  const handleSaveDraft = () => {
    sessionStorage.setItem(draftKey(taskId), value);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt((t) => (t === null ? null : t)), 0);
  };

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setLocalError('Please enter an answer before submitting.');
      return;
    }
    setLocalError(null);
    await onSubmit(trimmed);
    sessionStorage.removeItem(draftKey(taskId));
  };

  return (
    <div className="mt-4 space-y-3">
      <textarea
        className="w-full min-h-[260px] rounded-md border p-3 text-sm leading-6"
        placeholder="Write your response here…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
      />

      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{charCount.toLocaleString()} characters</span>
        {savedAt && <span>Draft saved</span>}
      </div>

      {(localError || submitError) && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {localError ?? submitError}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" onClick={handleSaveDraft} disabled={disabled}>
            Save draft
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={disabled}>
          Submit
        </Button>
      </div>
    </div>
  );
}
