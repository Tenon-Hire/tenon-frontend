import { ReactNode } from 'react';

type ActionRowProps = {
  children: ReactNode;
};

export function ActionRow({ children }: ActionRowProps) {
  return <div className="flex flex-wrap gap-3">{children}</div>;
}
