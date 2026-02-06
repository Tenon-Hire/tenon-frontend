'use client';

import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { cn } from './classnames';

export type MarkdownPreviewProps = {
  content: string | null | undefined;
  className?: string;
  emptyPlaceholder?: ReactNode;
};

const markdownClassName =
  'markdown-content text-sm leading-6 text-gray-900 [&_h1]:mb-3 [&_h1]:mt-0 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-gray-900 [&_pre]:p-3 [&_pre]:text-white [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-3 [&_a]:text-blue-700 [&_a]:underline';

export function MarkdownPreview({
  content,
  className,
  emptyPlaceholder,
}: MarkdownPreviewProps) {
  const safeContent = typeof content === 'string' ? content : '';

  if (!safeContent.trim()) {
    return (
      <div className={cn('text-sm text-gray-500', className)}>
        {emptyPlaceholder ?? 'Nothing to preview yet.'}
      </div>
    );
  }

  return (
    <div className={cn(markdownClassName, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {safeContent}
      </ReactMarkdown>
    </div>
  );
}
