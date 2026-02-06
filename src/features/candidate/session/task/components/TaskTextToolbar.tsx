import { cn } from '@/shared/ui/classnames';

type Props = {
  mode: 'write' | 'preview';
  onChange: (mode: 'write' | 'preview') => void;
};

export function TaskTextToolbar({ mode, onChange }: Props) {
  return (
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
          onClick={() => onChange('write')}
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
          onClick={() => onChange('preview')}
        >
          Preview
        </button>
      </div>
    </div>
  );
}
