import type { StatusPillTone } from './types';

export type StatusMeta = { label: string; tone: StatusPillTone };

const STATUS_META: Record<string, StatusMeta> = {
  not_started: { label: 'Not started', tone: 'muted' },
  in_progress: { label: 'In progress', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
  not_sent: { label: 'Not sent', tone: 'muted' },
  sent: { label: 'Email sent', tone: 'info' },
  queued: { label: 'Queued', tone: 'info' },
  delivered: { label: 'Delivered', tone: 'success' },
  opened: { label: 'Opened', tone: 'success' },
  failed: { label: 'Delivery failed', tone: 'warning' },
  bounced: { label: 'Bounced', tone: 'warning' },
  rate_limited: { label: 'Rate limited', tone: 'warning' },
  verified: { label: 'Verified', tone: 'success' },
  pending: { label: 'Pending', tone: 'info' },
  required: { label: 'Required', tone: 'warning' },
  verification_failed: { label: 'Failed', tone: 'warning' },
  not_verified: { label: 'Not verified', tone: 'muted' },
  expired: { label: 'Expired', tone: 'warning' },
  submitting: { label: 'Submitting…', tone: 'info' },
  submitted: { label: 'Submitted', tone: 'success' },
  report_ready: { label: 'Report ready', tone: 'success' },
  report_missing: { label: 'Report not ready', tone: 'muted' },
  locked: { label: 'Locked', tone: 'muted' },
};

const normalizeStatus = (status: string | null | undefined) =>
  (status ?? '').toString().trim().toLowerCase();

const friendlyLabel = (status: string | null | undefined, fallback: string) => {
  const normalized = normalizeStatus(status);
  if (!normalized) return fallback;
  return normalized.replace(/_/g, ' ');
};

export const statusMeta = (
  status: string | null | undefined,
  fallbackLabel = 'Unknown',
): StatusMeta => {
  const meta = STATUS_META[normalizeStatus(status)];
  if (meta) return meta;
  return { label: friendlyLabel(status, fallbackLabel), tone: 'muted' };
};
