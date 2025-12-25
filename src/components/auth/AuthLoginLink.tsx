import { ReactNode } from 'react';
import { buildLoginHref } from './authUrls';

type AuthLoginLinkProps = {
  returnTo: string;
  className?: string;
  children: ReactNode;
};

export default function AuthLoginLink({
  returnTo,
  className,
  children,
}: AuthLoginLinkProps) {
  const href = buildLoginHref(returnTo);
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
