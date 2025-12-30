import { ReactNode } from 'react';
import { buildLogoutHref } from './authPaths';

type LogoutLinkProps = {
  returnTo?: string;
  className?: string;
  children: ReactNode;
};

export default function LogoutLink({
  returnTo,
  className,
  children,
}: LogoutLinkProps) {
  const href = buildLogoutHref(returnTo);
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
