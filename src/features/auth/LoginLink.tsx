import { ReactNode } from 'react';
import { buildLoginHref, type LoginMode } from './authPaths';

type LoginLinkProps = {
  returnTo?: string;
  mode?: LoginMode;
  className?: string;
  children: ReactNode;
};

export default function LoginLink({
  returnTo,
  mode,
  className,
  children,
}: LoginLinkProps) {
  const href = buildLoginHref(returnTo, mode);
  return (
    <a href={href} className={className} data-nav="login-link" rel="noopener">
      {children}
    </a>
  );
}
