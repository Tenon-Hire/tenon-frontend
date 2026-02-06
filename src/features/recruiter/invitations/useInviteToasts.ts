import { useEffect, useRef } from 'react';
import { useNotifications } from '@/features/shared/notifications';
import { copyToClipboard } from '../utils/formatters';
import type { InviteSuccess } from '@/types/recruiter';

export function useInviteToasts() {
  const { notify, update } = useNotifications();
  const timers = useRef<Record<string, number>>({});

  useEffect(
    () => () =>
      Object.values(timers.current).forEach((id) => window.clearTimeout(id)),
    [],
  );

  const showInviteToast = (res: InviteSuccess) => {
    const toastId = `invite-${res.simulationId}-${res.candidateEmail}`;
    const who = res.candidateName
      ? `${res.candidateName} (${res.candidateEmail})`
      : res.candidateEmail;
    const actionLabel = res.outcome === 'resent' ? 'resent' : 'sent';

    const resetActions = () => {
      update(toastId, {
        actions: res.inviteUrl
          ? [{ label: 'Copy invite link', onClick: handleCopy }]
          : undefined,
      });
      if (timers.current[toastId]) {
        window.clearTimeout(timers.current[toastId]);
        delete timers.current[toastId];
      }
    };

    const handleCopy = async () => {
      if (!res.inviteUrl) return;
      if (timers.current[toastId]) {
        window.clearTimeout(timers.current[toastId]);
        delete timers.current[toastId];
      }
      const ok = await copyToClipboard(res.inviteUrl);
      if (!ok) {
        notify({
          id: `invite-copy-${res.simulationId}-${res.candidateEmail}`,
          tone: 'error',
          title: 'Copy failed',
          description: 'Copy manually from the simulation detail.',
        });
        resetActions();
        return;
      }
      update(toastId, { actions: [{ label: 'Copied', disabled: true }] });
      timers.current[toastId] = window.setTimeout(resetActions, 1800);
    };

    notify({
      id: toastId,
      tone: 'success',
      title: `Invite ${actionLabel} for ${who}.`,
      description: res.inviteUrl
        ? 'Share this link with the candidate.'
        : undefined,
      actions: res.inviteUrl
        ? [{ label: 'Copy invite link', onClick: handleCopy }]
        : undefined,
    });
  };

  return { showInviteToast };
}
