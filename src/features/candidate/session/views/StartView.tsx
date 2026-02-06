import { StartActions } from './components/StartActions';
import { StartHowCode } from './components/StartHowCode';
import { StartIntro } from './components/StartIntro';
import { StartSafety } from './components/StartSafety';

type Props = {
  title: string;
  role: string;
  onStart: () => void;
  onDashboard: () => void;
};

export function StartView({ title, role, onStart, onDashboard }: Props) {
  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <StartIntro title={title} role={role} />

      <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
        <h2 className="text-sm font-semibold text-blue-900">What to expect</h2>
        <ul className="mt-2 space-y-1 text-sm text-blue-900">
          <li>
            <b>Day 1:</b> architecture plan (written).
          </li>
          <li>
            <b>Days 2–3:</b> GitHub-native code tasks (repo + Codespaces +
            Actions).
          </li>
          <li>
            <b>Day 4:</b> handoff demo & presentation.
          </li>
          <li>
            <b>Day 5:</b> documentation & wrap-up.
          </li>
          <li>Schedule: 9:00 AM–5:00 PM local time, for 5 consecutive days.</li>
        </ul>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StartHowCode />
        <StartSafety />
      </div>

      <StartActions onStart={onStart} onDashboard={onDashboard} />
    </div>
  );
}
