export const toSafeString = (value: unknown) => {
  if (value && typeof value === 'object') {
    const maybeEvent = value as {
      target?: { value?: unknown };
      currentTarget?: { value?: unknown };
      value?: unknown;
    };
    const candidate =
      maybeEvent.value ??
      maybeEvent.target?.value ??
      maybeEvent.currentTarget?.value;
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      return String(candidate);
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return '';
};

export const friendlyInviteError = (err: unknown) => {
  const status =
    err && typeof err === 'object'
      ? (err as { status?: unknown }).status
      : null;
  const details =
    err && typeof err === 'object'
      ? (err as { details?: unknown }).details
      : null;
  const errorCode =
    details && typeof details === 'object'
      ? (details as { error?: { code?: unknown } }).error?.code
      : null;

  if (status === 409 && errorCode === 'candidate_already_completed') {
    return 'Candidate already completed this simulation and cannot be re-invited.';
  }
  if (status === 422) return 'Enter a valid email address.';
  if (status === 429)
    return 'Too many invites sent. Please wait and try again.';
  return null;
};
