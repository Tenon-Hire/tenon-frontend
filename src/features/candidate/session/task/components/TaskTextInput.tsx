import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { MarkdownPreviewProps } from '@/components/ui/Markdown';
import { TaskTextToolbar } from './TaskTextToolbar';
import { TaskTextFooter } from './TaskTextFooter';

const LazyMarkdownPreview = dynamic(
  () => import('@/components/ui/Markdown').then((m) => m.MarkdownPreview),
  {
    loading: () => (
      <div className="text-xs text-gray-500" aria-label="loading-markdown">
        Loading preview…
      </div>
    ),
    ssr: false,
  },
);

let PreviewComponent: React.ComponentType<MarkdownPreviewProps> =
  LazyMarkdownPreview;
if (process.env.NODE_ENV === 'test') {
  const mod =
    require('@/components/ui/Markdown') as typeof import('@/components/ui/Markdown'); // eslint-disable-line @typescript-eslint/no-require-imports
  PreviewComponent = mod.MarkdownPreview;
}

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
      <TaskTextToolbar mode={mode} onChange={setMode} />

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
          <PreviewComponent
            content={value}
            emptyPlaceholder="Add content to preview your Markdown formatting."
          />
        </div>
      )}

      <TaskTextFooter length={value.length} savedAt={savedAt} />
    </>
  );
}
