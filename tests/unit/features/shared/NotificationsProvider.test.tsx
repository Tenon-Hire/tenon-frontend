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

  it('supports actions, updates, and auto dismiss cleanup', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const actionSpy = jest.fn();

    function ActionTrigger() {
      const { notify, update } = useNotifications();
      return (
        <>
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
          <button
            type="button"
            onClick={() =>
              update('with-action', {
                actions: [{ label: 'Updated', disabled: true }],
              })
            }
          >
            update
          </button>
        </>
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

    await user.click(screen.getByRole('button', { name: /update/i }));
    expect(screen.getByRole('button', { name: /Updated/i })).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(15);
    });
    expect(screen.queryByRole('status')).toBeNull();
    jest.useRealTimers();
  });

  it('allows action label to flip to Copied and revert', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    function CopyTrigger() {
      const { notify, update } = useNotifications();
      return (
        <>
          <button
            type="button"
            onClick={() =>
              notify({
                id: 'copy-toast',
                tone: 'success',
                title: 'Invite sent',
                actions: [
                  {
                    label: 'Copy invite link',
                    onClick: () => {
                      update('copy-toast', {
                        actions: [{ label: 'Copied', disabled: true }],
                      });
                      setTimeout(() => {
                        update('copy-toast', {
                          actions: [
                            {
                              label: 'Copy invite link',
                              onClick: () => {},
                            },
                          ],
                        });
                      }, 1800);
                    },
                  },
                ],
              })
            }
          >
            make
          </button>
        </>
      );
    }

    render(
      <NotificationsProvider>
        <CopyTrigger />
      </NotificationsProvider>,
    );

    await user.click(screen.getByText('make'));
    await user.click(screen.getByRole('button', { name: /Copy invite link/i }));
    expect(screen.getByRole('button', { name: /Copied/i })).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(1850);
    });
    expect(
      screen.getByRole('button', { name: /Copy invite link/i }),
    ).toBeEnabled();

    jest.useRealTimers();
  });
});
