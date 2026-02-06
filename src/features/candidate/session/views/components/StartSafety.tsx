export function StartSafety() {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-amber-900">Safety + setup</h2>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-amber-900">
        <li>Do not paste tokens or secrets into the UI or repo.</li>
        <li>Use the repo link provided; do not create your own repo.</li>
        <li>
          Use the Codespace link in the workspace card to open your editor and
          terminal.
        </li>
      </ul>
      <div className="mt-3 text-xs text-amber-900">
        Unsure where the editor/terminal is? Open Codespaces from the workspace
        card once it appears.
      </div>
    </div>
  );
}
