import Link from 'next/link';
import { AppNav } from './AppNav';
import { contentContainer } from './layoutClasses';

type AppHeaderProps = {
  isAuthed: boolean;
};

export function AppHeader({ isAuthed }: AppHeaderProps) {
  return (
    <header className="border-b bg-white">
      <div
        className={`${contentContainer} flex items-center justify-between py-3`}
      >
        <Link href="/" className="text-lg font-semibold tracking-tight">
          SimuHire
        </Link>
        <AppNav isAuthed={isAuthed} />
      </div>
    </header>
  );
}
