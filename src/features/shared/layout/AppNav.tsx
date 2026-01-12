import Link from 'next/link';

type AppNavProps = {
  isAuthed: boolean;
  permissions?: string[];
  navScope?: 'candidate' | 'recruiter' | 'marketing' | 'auth';
};

export function AppNav({
  isAuthed,
  permissions = [],
  navScope,
}: AppNavProps) {
  if (!isAuthed) {
    return null;
  }

  const canRecruiter = permissions.includes('recruiter:access');
  const canCandidate = permissions.includes('candidate:access');
  const scopedRecruiter = navScope === 'recruiter' && canRecruiter;
  const scopedCandidate = navScope === 'candidate' && canCandidate;
  const showRecruiter = scopedRecruiter;
  const showCandidate = scopedCandidate;

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
