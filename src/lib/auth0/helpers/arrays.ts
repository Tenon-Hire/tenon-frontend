export const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? (value.filter((v) => typeof v === 'string') as string[])
    : [];

export const parsePermissionsString = (value: unknown): string[] =>
  typeof value !== 'string'
    ? []
    : value
        .split(/[,\s]+/)
        .map((part) => part.trim())
        .filter(Boolean);

export const rolesToPermissions = (roles: string[]): string[] => {
  const perms = new Set<string>();
  roles.forEach((role) => {
    const lower = role.toLowerCase();
    if (lower.includes('recruiter')) perms.add('recruiter:access');
    if (lower.includes('candidate')) perms.add('candidate:access');
  });
  return Array.from(perms);
};
