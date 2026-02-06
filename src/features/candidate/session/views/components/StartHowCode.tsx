export function StartHowCode() {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">
        How code tasks work
      </h2>
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-gray-700">
        <li>
          Tenon provisions a GitHub repo from a template. You may be asked for
          your GitHub username.
        </li>
        <li>
          Open the repo in Codespaces from the workspace card — that’s your
          editor and terminal.
        </li>
        <li>
          Run tests from Tenon. We trigger GitHub Actions and show results back
          in this panel.
        </li>
        <li>
          Commit and submit from Tenon. We capture your latest commit SHA with
          your submission.
        </li>
      </ol>
    </div>
  );
}
