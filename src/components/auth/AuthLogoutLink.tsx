import { ReactNode } from 'react';
import { buildLogoutHref } from './authUrls';

type AuthLogoutLinkProps = {
  returnTo?: string;
  className?: string;
  children: ReactNode;
};

export default function AuthLogoutLink({
  returnTo,
  className,
  children,
}: AuthLogoutLinkProps) {
  const href = buildLogoutHref(returnTo);
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
