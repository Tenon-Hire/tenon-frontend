'use client';
import { formatDateTime } from '../utils/formatters';

export function CandidateDateCell({ value }: { value: string | null }) {
  const label = formatDateTime(value);
  return <td className="px-4 py-3 align-top text-gray-700">{label ?? '—'}</td>;
}
