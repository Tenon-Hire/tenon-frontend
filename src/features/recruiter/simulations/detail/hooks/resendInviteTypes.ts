import type { RowState } from './types';

export type UpdateRow = (
  id: string,
  next: (prev: RowState) => RowState,
) => void;

export type Notify = (opts: {
  id: string;
  tone: 'success' | 'error';
  title: string;
  description?: string;
}) => void;
