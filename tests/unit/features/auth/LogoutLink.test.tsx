import { render, screen, fireEvent } from '@testing-library/react';
import LogoutLink from '@/features/auth/LogoutLink';

const mockLocationAssign = () => {
  const originalLocation = window.location;
  const assignSpy = jest.fn();
  delete (window as unknown as { location?: Location }).location;
  Object.defineProperty(window, 'location', {
    value: { ...originalLocation, assign: assignSpy },
    configurable: true,
  });
  const restore = () => {
    delete (window as unknown as { location?: Location }).location;
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
    });
  };
  return { assignSpy, restore };
};

const firePointerUp = (
  element: Element,
  options?: {
    button?: number;
    buttons?: number;
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
  },
) => {
  const event = new window.PointerEvent('pointerup', {
    bubbles: true,
    button: options?.button ?? 0,
    buttons: options?.buttons ?? 1,
    metaKey: options?.metaKey ?? false,
    ctrlKey: options?.ctrlKey ?? false,
    shiftKey: options?.shiftKey ?? false,
  });
  element.dispatchEvent(event);
};

describe('LogoutLink', () => {
  beforeAll(() => {
    const win = globalThis as unknown as {
      PointerEvent?: typeof PointerEvent;
      MouseEvent?: typeof MouseEvent;
    };
    if (!('PointerEvent' in win)) {
      win.PointerEvent = win.MouseEvent as unknown as typeof PointerEvent;
    }
  });

  it('navigates on pointerup for primary clicks', () => {
    const { assignSpy, restore } = mockLocationAssign();
    render(<LogoutLink>Logout</LogoutLink>);

    firePointerUp(screen.getByText('Logout'), { button: 0, buttons: 1 });

    expect(assignSpy).toHaveBeenCalledTimes(1);
    expect(assignSpy).toHaveBeenCalledWith('/auth/logout');
    restore();
  });

  it('navigates on mouseup when pointerup did not handle', () => {
    const { assignSpy, restore } = mockLocationAssign();
    render(<LogoutLink>Logout</LogoutLink>);

    fireEvent.mouseUp(screen.getByText('Logout'), { button: 0 });

    expect(assignSpy).toHaveBeenCalledTimes(1);
    expect(assignSpy).toHaveBeenCalledWith('/auth/logout');
    restore();
  });

  it('avoids double handling when pointerup already navigated', () => {
    const { assignSpy, restore } = mockLocationAssign();
    render(<LogoutLink>Logout</LogoutLink>);

    const link = screen.getByText('Logout');
    firePointerUp(link, { button: 0, buttons: 1 });
    fireEvent.mouseUp(link, { button: 0 });

    expect(assignSpy).toHaveBeenCalledTimes(1);
    restore();
  });

  it('ignores modified or non-primary clicks', () => {
    const { assignSpy, restore } = mockLocationAssign();
    render(<LogoutLink>Logout</LogoutLink>);

    const link = screen.getByText('Logout');
    firePointerUp(link, { button: 2, buttons: 2 });
    firePointerUp(link, { button: 0, buttons: 1, metaKey: true });
    firePointerUp(link, { button: 0, buttons: 1, ctrlKey: true });
    fireEvent.mouseUp(link, { button: 0, shiftKey: true });

    expect(assignSpy).not.toHaveBeenCalled();
    restore();
  });
});
