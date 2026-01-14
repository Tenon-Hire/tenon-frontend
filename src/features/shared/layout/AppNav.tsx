import Link from 'next/link';
import { buildLogoutHref } from '@/features/auth/authPaths';

type AppNavProps = {
  isAuthed: boolean;
  permissions?: string[];
  navScope?: 'candidate' | 'recruiter' | 'marketing' | 'auth';
};

export function AppNav({ isAuthed, permissions = [], navScope }: AppNavProps) {
  if (!isAuthed) {
    return null;
  }

  const canRecruiter = permissions.includes('recruiter:access');
  const canCandidate = permissions.includes('candidate:access');
  const isRecruiterScope = navScope === 'recruiter';
  const isCandidateScope = navScope === 'candidate';
  const allowRecruiter =
    isRecruiterScope && (canRecruiter || permissions.length === 0);
  const allowCandidate =
    isCandidateScope && (canCandidate || permissions.length === 0);
  const showRecruiter = allowRecruiter;
  const showCandidate = allowCandidate;
  const logoutReturnTo = isCandidateScope ? '/' : '/dashboard';

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
      <a
        href={buildLogoutHref(logoutReturnTo)}
        className="text-gray-700 hover:text-gray-900"
      >
        Logout
      </a>
    </nav>
  );
}
