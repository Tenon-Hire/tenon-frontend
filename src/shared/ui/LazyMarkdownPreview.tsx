'use client';

import dynamic from 'next/dynamic';
import type { MarkdownPreviewProps } from './Markdown';

export const LazyMarkdownPreview = dynamic<MarkdownPreviewProps>(
  () => import('./Markdown').then((mod) => mod.MarkdownPreview),
  {
    ssr: false,
    loading: () => (
      <div className="text-xs text-gray-500">Loading preview…</div>
    ),
  },
);
