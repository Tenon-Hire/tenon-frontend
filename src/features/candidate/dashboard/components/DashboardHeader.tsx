export function DashboardHeader({ email }: { email: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-3xl font-semibold text-gray-900">
        Candidate Dashboard
      </h1>
      <p className="text-sm text-gray-600">
        {email ? `Signed in as ${email}` : 'Sign in to see your simulations.'}
      </p>
    </div>
  );
}
