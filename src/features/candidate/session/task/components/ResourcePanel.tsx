'use client';

type ResourcePanelProps = {
  title: string;
  description: string;
  linkUrl?: string | null;
  linkLabel?: string;
  emptyMessage?: string;
};

export function ResourcePanel({
  title,
  description,
  linkUrl,
  linkLabel = 'Open resource',
  emptyMessage = 'The link will appear in the task prompt when available.',
}: ResourcePanelProps) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="mt-1 text-xs text-gray-600">{description}</div>
      <div className="mt-3 text-sm text-gray-700">
        {linkUrl ? (
          <a
            className="text-blue-600 hover:underline"
            href={linkUrl}
            target="_blank"
            rel="noreferrer"
          >
            {linkLabel}
          </a>
        ) : (
          <div className="text-xs text-gray-500">{emptyMessage}</div>
        )}
      </div>
    </div>
  );
}
