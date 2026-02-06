export const formatStatusLabel = (value: string | null | undefined) => {
  if (!value) return '';
  const normalized = value.trim().replace(/_/g, ' ').toLowerCase();
  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};
