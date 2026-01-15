'use client';

import { ReactNode, useRef, type MouseEvent, type PointerEvent } from 'react';
import { buildLogoutHref } from './authPaths';

type LogoutLinkProps = {
  returnTo?: string;
  className?: string;
  children: ReactNode;
};

type LogoutEvent =
  | MouseEvent<HTMLAnchorElement>
  | PointerEvent<HTMLAnchorElement>;

const isPrimaryPlainClick = (event: LogoutEvent) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

export default function LogoutLink({
  returnTo,
  className,
  children,
}: LogoutLinkProps) {
  const href = buildLogoutHref(returnTo);
  const handledPointerUp = useRef(false);

  const navigateOnUp = (event: LogoutEvent) => {
    if (!isPrimaryPlainClick(event)) return;
    event.preventDefault();
    window.location.assign(href);
  };

  const handlePointerUp = (event: PointerEvent<HTMLAnchorElement>) => {
    handledPointerUp.current = true;
    navigateOnUp(event);
  };

  const handleMouseUp = (event: MouseEvent<HTMLAnchorElement>) => {
    if (handledPointerUp.current) {
      handledPointerUp.current = false;
      return;
    }
    navigateOnUp(event);
  };

  return (
    <a
      href={href}
      className={className}
      onPointerUp={handlePointerUp}
      onMouseUp={handleMouseUp}
    >
      {children}
    </a>
  );
}
