import { HttpError } from '@/lib/api/candidate';
import { toUserMessage } from '@/lib/utils/errors';

function statusFromUnknown(err: unknown): number | undefined {
  if (err instanceof HttpError) return err.status;
  const anyErr = err as { status?: unknown } | undefined;
  return typeof anyErr?.status === 'number' ? anyErr.status : undefined;
}

function messageFromUnknown(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  const anyErr = err as { message?: unknown } | undefined;
  return typeof anyErr?.message === 'string' ? anyErr.message : undefined;
}

export function friendlyBootstrapError(err: unknown): string {
  const status = statusFromUnknown(err);

  if (status === 404) return 'That invite link is invalid.';
  if (status === 410) return 'That invite link has expired.';
  if (!status || status === 0)
    return 'Network error. Please check your connection and try again.';

  const msg = messageFromUnknown(err);
  if (msg && msg.trim().length > 0) return msg;

  return 'Something went wrong loading your simulation.';
}

export function friendlyTaskError(err: unknown): string {
  const status = statusFromUnknown(err);

  if (status === 404)
    return 'Session not found. Please reopen your invite link.';
  if (status === 410) return 'That invite link has expired.';
  if (!status || status === 0)
    return 'Network error. Please check your connection and try again.';

  const msg = messageFromUnknown(err);
  if (msg && msg.trim().length > 0) return msg;

  return 'Something went wrong loading your current task.';
}

export function friendlyClaimError(err: unknown): string {
  const status = statusFromUnknown(err);

  if (status === 404) return 'That invite link is invalid.';
  if (status === 410) return 'That invite link has expired.';
  if (status === 401 || status === 403) {
    const msg = messageFromUnknown(err)?.trim();
    if (msg) return msg;
    return 'This invite was sent to a different email.';
  }
  if (!status || status === 0)
    return 'Network error. Please check your connection and try again.';

  const msg = messageFromUnknown(err);
  if (msg && msg.trim().length > 0) return msg;

  return 'Unable to claim your invite right now. Please try again.';
}

export function friendlySubmitError(err: unknown): string {
  const status = statusFromUnknown(err);

  if (status === 400) return 'Task out of order.';
  if (status === 409) return 'Task already submitted.';
  if (status === 404)
    return 'Session mismatch. Please reopen your invite link.';
  if (status === 410) return 'That invite link has expired.';
  if (!status || status === 0)
    return 'Network error. Please check your connection and try again.';

  return toUserMessage(err, 'Something went wrong submitting your task.');
}
