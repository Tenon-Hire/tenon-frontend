import { ReactNode } from 'react';

type ActionRowProps = {
  children: ReactNode;
  align?: 'start' | 'center';
};

export function ActionRow({ children, align = 'start' }: ActionRowProps) {
  const justify = align === 'center' ? 'justify-center' : 'justify-start';
  return <div className={`flex flex-wrap gap-3 ${justify}`}>{children}</div>;
}
