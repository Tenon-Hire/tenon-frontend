import { useState } from 'react';
import { cn } from '@/components/ui/classnames';
import { LazyMarkdownPreview } from '@/components/ui/LazyMarkdownPreview';

type TaskTextInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  savedAt: number | null;
};

export function TaskTextInput({
  value,
  onChange,
  disabled,
  savedAt,
}: TaskTextInputProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span className="leading-5">
            Markdown is supported for headings, lists, emphasis, and code. Use
            Preview to verify formatting.
          </span>
          <a
            className="text-blue-600 hover:text-blue-700 hover:underline"
            href="https://www.markdownguide.org/cheat-sheet/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Cheat sheet
          </a>
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white text-xs font-medium">
          <button
            type="button"
            aria-pressed={mode === 'write'}
            className={cn(
              'px-3 py-1 transition-colors',
              mode === 'write'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50',
            )}
            onClick={() => setMode('write')}
          >
            Write
          </button>
          <button
            type="button"
            aria-pressed={mode === 'preview'}
            className={cn(
              'border-l border-gray-200 px-3 py-1 transition-colors',
              mode === 'preview'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50',
            )}
            onClick={() => setMode('preview')}
          >
            Preview
          </button>
        </div>
      </div>

      {mode === 'write' ? (
        <textarea
          className="w-full min-h-[360px] md:min-h-[420px] rounded-md border p-3 text-sm leading-6 resize-y"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your response here… Markdown supported (e.g., # Heading, **bold**, - list)"
          disabled={disabled}
        />
      ) : (
        <div className="w-full min-h-[360px] md:min-h-[420px] rounded-md border bg-white p-3">
          <LazyMarkdownPreview
            content={value}
            emptyPlaceholder="Add content to preview your Markdown formatting."
          />
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>{value.length.toLocaleString()} characters</span>
        {savedAt ? <span>Draft saved</span> : null}
      </div>
    </>
  );
}
