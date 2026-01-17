import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  NotificationsProvider,
  useNotifications,
} from '@/features/shared/notifications';

function TriggerButton({
  id,
  title,
  actionLabel,
  onAction,
}: {
  id: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { notify } = useNotifications();
  return (
    <button
      type="button"
      onClick={() =>
        notify({
          id,
          tone: 'success',
          title,
          actions: actionLabel
            ? [
                {
                  label: actionLabel,
                  onClick: onAction,
                },
              ]
            : undefined,
        })
      }
    >
      trigger
    </button>
  );
}

describe('NotificationsProvider', () => {
  it('dedupes toasts by id and state', async () => {
    const user = userEvent.setup();
    render(
      <NotificationsProvider>
        <TriggerButton id="toast-1" title="First toast" />
      </NotificationsProvider>,
    );

    await user.click(screen.getByText('trigger'));
    await user.click(screen.getByText('trigger'));

    const toasts = screen.getAllByRole('status');
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toHaveTextContent('First toast');
  });

  it('supports actions and auto dismiss cleanup', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const actionSpy = jest.fn();

    function ActionTrigger() {
      const { notify } = useNotifications();
      return (
        <button
          type="button"
          onClick={() =>
            notify({
              id: 'with-action',
              tone: 'info',
              title: 'Toast with action',
              actions: [{ label: 'Do it', onClick: actionSpy }],
              durationMs: 10,
            })
          }
        >
          launch
        </button>
      );
    }

    render(
      <NotificationsProvider>
        <ActionTrigger />
      </NotificationsProvider>,
    );

    await user.click(screen.getByText('launch'));
    await user.click(screen.getByRole('button', { name: /Do it/i }));
    expect(actionSpy).toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(15);
    });
    expect(screen.queryByRole('status')).toBeNull();
    jest.useRealTimers();
  });
});
