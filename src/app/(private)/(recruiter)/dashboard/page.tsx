import { redirect } from "next/navigation";
import { auth0, getAccessToken } from "@/lib/auth0";
import RecruiterDashboardContent, {
  RecruiterProfile,
} from "./RecruiterDashboardContent";

export default async function DashboardPage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect('/login');
  }

  let me: RecruiterProfile | null = null;
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
      const body = (await response.json()) as RecruiterProfile;
      me = body;
    }
  } catch {
    error = 'Unexpected error while loading profile';
  }

  return <RecruiterDashboardContent profile={me} error={error} />;
}
