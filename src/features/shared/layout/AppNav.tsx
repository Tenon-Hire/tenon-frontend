import Link from 'next/link';

type AppNavProps = {
  isAuthed: boolean;
  permissions?: string[];
};

export function AppNav({ isAuthed, permissions = [] }: AppNavProps) {
  if (!isAuthed) {
    return null;
  }

  const canRecruiter = permissions.includes('recruiter:access');
  const canCandidate = permissions.includes('candidate:access');
  const showRecruiter =
    canRecruiter || (!canCandidate && permissions.length === 0);
  const showCandidate =
    canCandidate || (!canRecruiter && permissions.length === 0);

  return (
    <nav className="flex items-center gap-4 text-sm">
      {showRecruiter ? (
        <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
          Recruiter Dashboard
        </Link>
      ) : null}
      {showCandidate ? (
        <Link
          href="/candidate/dashboard"
          className="text-gray-700 hover:text-gray-900"
        >
          Candidate Portal
        </Link>
      ) : null}
      <a href="/auth/logout" className="text-gray-700 hover:text-gray-900">
        Logout
      </a>
    </nav>
  );
}
