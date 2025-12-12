import { ReactNode } from "react";

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
  const href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
