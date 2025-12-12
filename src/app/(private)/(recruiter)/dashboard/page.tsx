import { redirect } from 'next/navigation';
import { auth0, getAccessToken } from '@/lib/auth0';

type MeResponse = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export default async function DashboardPage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect('/login');
  }

  let me: MeResponse | null = null;
  let error: string | null = null;

  try {
    const accessToken = await getAccessToken();
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

    const response = await fetch(`${apiBase}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      error = 'Unable to fetch profile';
    } else {
      const body = (await response.json()) as MeResponse;
      me = body;
    }
  } catch {
    error = 'Unexpected error while loading profile';
  }

  return (
    <main className="flex flex-col gap-4 py-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {me ? (
        <div className="rounded border border-gray-200 p-4">
          <p className="font-medium">{me.name}</p>
          <p className="text-sm text-gray-600">{me.email}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">Role: {me.role}</p>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!me && !error ? (
        <p className="text-sm text-gray-600">No profile data available.</p>
      ) : null}
    </main>
  );
}
