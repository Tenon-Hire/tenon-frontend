import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react';
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
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });
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
                durationMs: 1000,
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
    const actionButton = await screen.findByRole('button', { name: /Do it/i });
    fireEvent.click(actionButton);
    expect(actionSpy).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /update/i }));
    const updatedBtn = await screen.findByRole('button', { name: /Updated/i });
    expect(updatedBtn).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(1100);
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

  it('dismisses via button and skips auto-dismiss when sticky', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    function StickyTrigger() {
      const { notify } = useNotifications();
      return (
        <>
          <button
            onClick={() =>
              notify({
                id: 'sticky',
                tone: 'warning',
                title: 'Persist',
                sticky: true,
              })
            }
          >
            sticky
          </button>
          <button
            onClick={() =>
              notify({
                id: 'temp',
                tone: 'info',
                title: 'Temp',
                durationMs: 5,
              })
            }
          >
            temp
          </button>
        </>
      );
    }

    render(
      <NotificationsProvider>
        <StickyTrigger />
      </NotificationsProvider>,
    );

    await user.click(screen.getByText('sticky'));
    await user.click(screen.getByText('temp'));

    act(() => {
      jest.advanceTimersByTime(10);
    });
    expect(screen.getByText('Persist')).toBeInTheDocument(); // sticky remains
    expect(screen.queryByText('Temp')).toBeNull(); // temp auto-dismissed

    await user.click(
      screen.getByRole('button', { name: /Dismiss notification/i }),
    );
    expect(screen.queryByText('Persist')).toBeNull();
    jest.useRealTimers();
  });

  it('update no-op when toast id missing', () => {
    function NoopUpdater() {
      const { update } = useNotifications();
      update('missing', { title: 'ignored' });
      return null;
    }

    render(
      <NotificationsProvider>
        <NoopUpdater />
      </NotificationsProvider>,
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('reuses toast id instead of duplicating and skips auto-dismiss when duration <= 0', async () => {
    jest.useFakeTimers();
    const userDup = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });

    function DupTrigger() {
      const { notify } = useNotifications();
      return (
        <>
          <button
            onClick={() =>
              notify({
                id: 'dup',
                tone: 'info',
                title: 'First',
                durationMs: 0,
              })
            }
          >
            first
          </button>
          <button
            onClick={() =>
              notify({
                id: 'dup',
                tone: 'warning',
                title: 'Second',
              })
            }
          >
            second
          </button>
        </>
      );
    }

    render(
      <NotificationsProvider>
        <DupTrigger />
      </NotificationsProvider>,
    );

    await userDup.click(screen.getByText('first'));
    await userDup.click(screen.getByText('second'));

    const toasts = await screen.findAllByRole('status');
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toHaveTextContent('Second');

    // duration 0 => sticky, should not auto-dismiss
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
  });
});
