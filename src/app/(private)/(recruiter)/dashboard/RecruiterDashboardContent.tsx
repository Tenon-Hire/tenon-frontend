export type RecruiterProfile = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type RecruiterDashboardContentProps = {
  profile: RecruiterProfile | null;
  error: string | null;
};

export default function RecruiterDashboardContent({
  profile,
  error,
}: RecruiterDashboardContentProps) {
  return (
    <main className="flex flex-col gap-4 py-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {profile ? (
        <div className="rounded border border-gray-200 p-4">
          <p className="font-medium">{profile.name}</p>
          <p className="text-sm text-gray-600">{profile.email}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
            Role: {profile.role}
          </p>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!profile && !error ? (
        <p className="text-sm text-gray-600">No profile data available.</p>
      ) : null}
    </main>
  );
}
