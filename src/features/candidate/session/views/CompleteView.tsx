import { StateMessage } from '../components/StateMessage';

export function CompleteView() {
  return (
    <StateMessage
      title="Simulation complete 🎉"
      description="You’ve submitted all 5 days. You can close this tab now."
    />
  );
}
