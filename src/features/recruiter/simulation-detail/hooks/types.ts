export type RowState = {
  resending?: boolean;
  copied?: boolean;
  error?: string | null;
  message?: string | null;
  cooldownUntilMs?: number | null;
  manualCopyUrl?: string | null;
  manualCopyOpen?: boolean;
};
