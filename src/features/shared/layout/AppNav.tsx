import Link from 'next/link';

type AppNavProps = {
  isAuthed: boolean;
};

export function AppNav({ isAuthed }: AppNavProps) {
  if (!isAuthed) {
    return null;
  }

  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
        Dashboard
      </Link>
      <Link href="/logout" className="text-gray-700 hover:text-gray-900">
        Logout
      </Link>
    </nav>
  );
}
