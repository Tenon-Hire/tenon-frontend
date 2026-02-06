import type { Notify } from './resendInviteTypes';

export const notifySuccess = (notify: Notify, id: string) =>
  notify({
    id: `invite-resent-${id}`,
    tone: 'success',
    title: 'Invite resent',
    description: 'A fresh invite email is on the way.',
  });

export const notifyError = (notify: Notify, id: string, description: string) =>
  notify({
    id: `invite-resend-error-${id}`,
    tone: 'error',
    title: 'Unable to resend invite',
    description,
  });
