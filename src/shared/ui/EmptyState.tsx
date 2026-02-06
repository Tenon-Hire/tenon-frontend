'use client';

import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-700">
      <div className="text-base font-semibold text-gray-900">{title}</div>
      <div className="mt-1 text-sm text-gray-600">{description}</div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
