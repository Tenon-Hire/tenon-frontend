'use client';
import { MarkdownPreview } from '@/shared/ui/Markdown';
import { Pre } from './Pre';

function Prompt({ value }: { value: string }) {
  return <Pre label="Prompt" value={value} />;
}

function Text({
  expanded,
  previewText,
  content,
  onToggle,
}: {
  expanded: boolean;
  previewText: string | null;
  content: string;
  onToggle: () => void;
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-900">Text answer</div>
        <button
          type="button"
          className="text-sm text-blue-600 underline"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {expanded ? (
        <div className="mt-2" data-testid="md-preview">
          <MarkdownPreview content={content} />
        </div>
      ) : (
        <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-800">
          {previewText}
        </pre>
      )}
    </div>
  );
}

function Empty({
  showGithub,
  taskType,
}: {
  showGithub: boolean;
  taskType: string;
}) {
  return (
    <div className="mt-3 text-sm text-gray-600">
      {showGithub && taskType === 'code'
        ? 'This is a code task; see GitHub artifacts and test results above.'
        : 'No text answer submitted.'}
    </div>
  );
}

export const ArtifactTextAnswer = { Prompt, Text, Empty };
