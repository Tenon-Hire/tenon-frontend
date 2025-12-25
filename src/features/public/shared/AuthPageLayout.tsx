import { ReactNode } from 'react';
import PageHeader from '@/components/ui/PageHeader';

type AuthPageLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthPageLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthPageLayoutProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <PageHeader title={title} subtitle={subtitle} />

        <div className="rounded-lg border px-6 py-8 shadow-sm">{children}</div>

        {footer ? <div className="text-xs text-gray-500">{footer}</div> : null}
      </div>
    </main>
  );
}
