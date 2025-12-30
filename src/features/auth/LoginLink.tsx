import { ReactNode } from 'react';
import { buildLoginHref } from './authPaths';

type LoginLinkProps = {
  returnTo?: string;
  className?: string;
  children: ReactNode;
};

export default function LoginLink({
  returnTo,
  className,
  children,
}: LoginLinkProps) {
  const href = buildLoginHref(returnTo);
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
